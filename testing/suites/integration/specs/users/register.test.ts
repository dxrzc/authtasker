import { faker } from '@faker-js/faker/.';
import crypto from 'crypto';
import { testKit } from '@integration/kit/test.kit';
import { createUser } from '@integration/utils/create-user.util';
import { status2xx } from '@integration/utils/status-2xx.util';
import { statusCodes } from 'src/constants/status-codes.constants';
import { userConstraints } from 'src/constraints/user.constraints';
import { RateLimiter } from 'src/enums/rate-limiter.enum';
import { UserRole } from 'src/enums/user-role.enum';
import { makeRefreshTokenIndexKey } from 'src/functions/token/make-refresh-token-index-key';
import { makeRefreshTokenKey } from 'src/functions/token/make-refresh-token-key';
import { IUser } from 'src/interfaces/user/user.interface';
import { commonErrors } from 'src/messages/common.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { rateLimitingSettings } from 'src/settings/rate-limiting.settings';

const registrationUrl = testKit.urls.register;

describe(`POST ${registrationUrl}`, () => {
    describe('Successful registration', () => {
        test(`default role is "readonly"`, async () => {
            const user = testKit.userData.user;
            await testKit.agent.post(registrationUrl).send(user).expect(status2xx);
            const userInDb = await testKit.models.user.findOne({ email: user.email }).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.role).toBe(UserRole.READONLY);
        });

        test('emailValidated property is false by default', async () => {
            const user = testKit.userData.user;
            await testKit.agent.post(registrationUrl).send(user).expect(status2xx);
            const userInDb = await testKit.models.user.findOne({ email: user.email }).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.emailValidated).toBeFalsy();
        });

        test('email is saved in db with no changes', async () => {
            const user = testKit.userData.user;
            await testKit.agent.post(registrationUrl).send(user).expect(status2xx);
            const userInDb = await testKit.models.user.findOne({ email: user.email }).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.email).toBe(user.email);
        });

        test('credentialsChangedAt is the current Date', async () => {
            const before = new Date();
            const user = testKit.userData.user;
            const res = await testKit.agent.post(registrationUrl).send(user).expect(status2xx);
            const after = new Date();
            const userInDb = await testKit.models.user.findById(res.body.user.id).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.credentialsChangedAt.getTime()).toBeGreaterThanOrEqual(
                before.getTime(),
            );
            expect(userInDb?.credentialsChangedAt.getTime()).toBeLessThanOrEqual(after.getTime());
        });

        test('name is transformed into lowercase and spaces are trimmed', async () => {
            const rawName =
                faker.string.alpha(userConstraints.MIN_NAME_LENGTH + 2).toUpperCase() + '  ';
            const expectedName = rawName.toLowerCase().trim();
            const res = await testKit.agent.post(registrationUrl).send({
                password: testKit.userData.password,
                email: testKit.userData.email,
                name: rawName,
            });
            const userInDb = await testKit.models.user.findById(res.body.user.id).exec();
            expect(userInDb).not.toBeNull();
            expect(userInDb?.name).toBe(expectedName);
        });

        test('return a valid refresh token', async () => {
            const { body } = await testKit.agent
                .post(registrationUrl)
                .send(testKit.userData.user)
                .expect(status2xx);
            expect(body.refreshToken).toBeDefined();
            expect(testKit.refreshJwt.verify(body.refreshToken)).not.toBeNull();
        });

        test('refresh token is stored in Redis', async () => {
            const { body } = await testKit.agent
                .post(registrationUrl)
                .send(testKit.userData.user)
                .expect(status2xx);
            const redisKey = makeRefreshTokenKey(body.user.id, body.refreshToken);
            const inRedis = await testKit.redisService.get(redisKey);
            expect(inRedis).toBeDefined();
        });

        test('refresh token is added to refresh tokens list of user', async () => {
            const { body } = await testKit.agent
                .post(registrationUrl)
                .send(testKit.userData.user)
                .expect(status2xx);
            const { jti } = testKit.refreshJwt.verify(body.refreshToken)!;
            const redisKey = makeRefreshTokenIndexKey(body.user.id);
            const inRedis = await testKit.redisService.belongsToList(redisKey, jti);
            expect(inRedis).toBeTruthy();
        });

        test('return a valid session token', async () => {
            const { body } = await testKit.agent
                .post(registrationUrl)
                .send(testKit.userData.user)
                .expect(status2xx);
            expect(body.sessionToken).toBeDefined();
            expect(testKit.sessionJwt.verify(body.sessionToken)).not.toBeNull();
        });

        test('password is not returned in body', async () => {
            const { body } = await testKit.agent
                .post(registrationUrl)
                .send(testKit.userData.user)
                .expect(status2xx);
            expect(body.user.password).toBeUndefined();
        });

        test('password peppered with HMAC-SHA256 is hashed and stored in database', async () => {
            const userData = testKit.userData.user;
            const { body } = await testKit.agent
                .post(registrationUrl)
                .send(userData)
                .expect(status2xx);
            const { password: passwordHash } = (await testKit.models.user
                .findById(body.user.id)
                .select('password')
                .exec()) as IUser;
            expect(passwordHash).toBeDefined();
            const pepper = testKit.configService.PASSWORD_PEPPER;
            const hmac = crypto.createHmac('sha256', pepper).update(userData.password).digest();
            const equal = await testKit.hashingService.compare(hmac, passwordHash);
            expect(equal).toBeTruthy();
        });

        test('return 201 status code, user data and tokens', async () => {
            const userData = testKit.userData.user;
            const response = await testKit.agent
                .post(registrationUrl)
                .send(userData)
                .expect(status2xx);
            expect(response.statusCode).toBe(statusCodes.CREATED);
            const userInDb = await testKit.models.user.findById(response.body.user.id).exec();
            expect(userInDb).not.toBeNull();
            expect(response.body).toStrictEqual({
                user: {
                    email: userInDb?.email,
                    role: userInDb?.role,
                    emailValidated: userInDb?.emailValidated,
                    name: userInDb?.name.toLowerCase().trim(),
                    createdAt: userInDb?.createdAt.toISOString(),
                    updatedAt: userInDb?.updatedAt.toISOString(),
                    id: userInDb?.id,
                },
                sessionToken: expect.any(String),
                refreshToken: expect.any(String),
            });
        });
    });

    describe('Username already exists', () => {
        test('return 409 status code and user already exists error message', async () => {
            const { name } = await createUser();
            const res = await testKit.agent.post(registrationUrl).send({
                password: testKit.userData.password,
                email: testKit.userData.email,
                name,
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.ALREADY_EXISTS });
            expect(res.statusCode).toBe(statusCodes.CONFLICT);
        });
    });

    describe('Email already exists', () => {
        test('return 409 status code and user already exists error message', async () => {
            const { email } = await createUser();
            const res = await testKit.agent.post(registrationUrl).send({
                password: testKit.userData.password,
                name: testKit.userData.name,
                email,
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.ALREADY_EXISTS });
            expect(res.statusCode).toBe(statusCodes.CONFLICT);
        });
    });

    describe('Email is not a valid email', () => {
        test('return 400 status code and invalid email error message', async () => {
            const res = await testKit.agent.post(registrationUrl).send({
                password: testKit.userData.password,
                name: testKit.userData.name,
                email: 'not-an-email',
            });
            expect(res.body).toStrictEqual({ error: usersApiErrors.INVALID_EMAIL });
            expect(res.statusCode).toBe(statusCodes.BAD_REQUEST);
        });
    });

    describe('Too many requests', () => {
        test('return 429 status code and too many requests error message', async () => {
            const ip = faker.internet.ip();
            for (let i = 0; i < rateLimitingSettings[RateLimiter.critical].max; i++) {
                await testKit.agent.post(registrationUrl).send({}).set('X-Forwarded-For', ip);
            }
            const response = await testKit.agent
                .post(registrationUrl)
                .send(testKit.userData.user)
                .set('X-Forwarded-For', ip);
            expect(response.body).toStrictEqual({ error: commonErrors.TOO_MANY_REQUESTS });
            expect(response.statusCode).toBe(statusCodes.TOO_MANY_REQUESTS);
        });
    });
});
