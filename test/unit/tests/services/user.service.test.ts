import { Model, Query } from "mongoose";
import { mock, MockProxy } from "jest-mock-extended";
import { faker } from "@faker-js/faker/.";
import { HttpError } from "@root/common/errors/classes/http-error.class";
import { getRandomRole } from "@unit/utils/get-random-role.util";
import { ConfigService } from '@root/services/config.service';
import { HashingService } from '@root/services/hashing.service';
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { LoggerService } from '@root/services/logger.service';
import { JwtService } from '@root/services/jwt.service';
import { UserService } from '@root/services/user.service';
import { EmailService } from '@root/services/email.service';
import { tokenPurposes } from '@root/common/constants/token-purposes.constants';
import { UpdateUserValidator } from '@root/validators/models/user/update-user.validator';
import { NoReadonly } from '@unit/utils/types/no-read-only.type';
import { IUser } from '@root/interfaces/user/user.interface';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { validRoles } from '@root/types/user/user-roles.type';
import { modificationAuthFixture } from './fixtures/modification-auth.fixture';
import { JwtTypes } from '@root/enums/jwt-types.enum';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { UserFromRequest } from '@root/interfaces/user/user-from-request.interface';

let configService: NoReadonly<ConfigService>;
let userModel: MockProxy<Model<IUser>>;
let tasksModel: MockProxy<Model<ITasks>>;
let hashingService: MockProxy<HashingService>;
let jwtService: JwtService;
let jwtBlacklistService: MockProxy<JwtBlackListService>;
let loggerService: MockProxy<LoggerService>;
let emailService: MockProxy<EmailService>;
let userService: UserService;

beforeEach(() => {
    configService = mock<ConfigService>();
    configService.JWT_PRIVATE_KEY = 'test-key-123';
    configService.JWT_SESSION_EXP_TIME = '10m';
    configService.JWT_EMAIL_VALIDATION_EXP_TIME = '1h';
    configService.WEB_URL = 'test_url';

    jwtService = new JwtService(configService.JWT_PRIVATE_KEY);
    userModel = mock<Model<IUser>>() as any;
    tasksModel = mock<Model<ITasks>>() as any;
    hashingService = mock<HashingService>();
    jwtBlacklistService = mock<JwtBlackListService>();
    loggerService = mock<LoggerService>();
    emailService = mock<EmailService>();
    userService = new UserService(
        configService,
        userModel as any,
        tasksModel as any,
        hashingService,
        jwtService,
        jwtBlacklistService,
        loggerService,
        emailService,
    );
});

describe('User Service', () => {
    describe('handleDbDuplicatedKeyError', () => {
        test('throw HttpError CONFLICT and the configured error message', async () => {
            expect(() => userService['handleDbDuplicatedKeyError']({ keyValue: '...' }))
                .toThrow(HttpError.conflict(usersApiErrors.USER_ALREADY_EXISTS))
        });
    });

    describe('getUserIfAuthorizedToModify', () => {
        test.each(
            validRoles
        )('%s users are authorized to modify themselves', async (role) => {
            const requestUser = {
                id: 'testId',
                role: role
            };

            const userToModify = {
                id: requestUser.id,
                role: requestUser.role
            };

            const findOneMock = jest.spyOn(userService, 'findOne').mockResolvedValue(userToModify as any);
            const result = await userService['getUserIfAuthorizedToModify'](requestUser, userToModify.id);

            expect(findOneMock).toHaveBeenCalledTimes(1);
            expect(result).toStrictEqual(userToModify);
        });

        test.each(
            modificationAuthFixture
        )('$currentUserRole users are $expected to modify $targetUserRole users', async ({ currentUserRole, targetUserRole, expected }) => {
            const requestUser = {
                id: 'testId',
                role: currentUserRole,
            };

            const userToModify = {
                id: 'anotherId',
                role: targetUserRole,
            };

            const findOneMock = jest.spyOn(userService, 'findOne').mockResolvedValue(userToModify as any);
            const result = await userService['getUserIfAuthorizedToModify'](requestUser, userToModify.id);

            expect(findOneMock).toHaveBeenCalledTimes(1);
            (expected === 'forbidden')
                ? expect(result).toBeNull()
                : expect(result).toStrictEqual(userToModify);
        });
    });

    describe('blacklistSessionToken', () => {
        describe('token has already expired', () => {
            test('jwtBlacklistService.blacklist is not called', async () => {
                const expiredTime = Math.floor(Date.now() / 1000) - 60;
                await userService['blacklistSessionToken']('test-jti', expiredTime);
                expect(jwtBlacklistService.blacklist).not.toHaveBeenCalled();
            });
        });

        describe('token has not expired', () => {
            test('call blacklist with session token type, jti and remaining expiration time', async () => {
                const jti = 'test-jti';
                // time
                const nowInSeconds = 10000;
                jest.spyOn(Date, 'now').mockReturnValue(nowInSeconds * 1000);
                const remainingTTLInSeconds = 79;

                await userService['blacklistSessionToken'](jti, nowInSeconds + remainingTTLInSeconds);
                expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                    JwtTypes.session,
                    jti,
                    remainingTTLInSeconds
                );
            });
        });
    });

    describe('blacklistEmailValidationToken', () => {
        test('does not call blacklist if token has expired', async () => {
            const expiredTime = Math.floor(Date.now() / 1000) - 60;
            await userService['blacklistEmailValidationToken']('test-jti', expiredTime);
            expect(jwtBlacklistService.blacklist).not.toHaveBeenCalled();
        });

        test('calls blacklist with email-validation token type, jti and remaining expiration time', async () => {
            const jti = 'test-jti';
            // time
            const nowInSeconds = 10000;
            jest.spyOn(Date, 'now').mockReturnValue(nowInSeconds * 1000);
            const remainingTTLInSeconds = 79;

            await userService['blacklistEmailValidationToken'](jti, nowInSeconds + remainingTTLInSeconds);
            expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                JwtTypes.emailValidation,
                jti,
                remainingTTLInSeconds
            );
        });
    });

    describe('generateSessionToken', () => {
        test('return a token with exp time, session purpose and the user id', async () => {
            const userId = 'userId12345';
            const token = userService['generateSessionToken'](userId);
            const payload = jwtService.verify(token);
            expect(payload).toBeDefined();
            expect(payload?.purpose).toBe(tokenPurposes.SESSION);
            expect(payload?.id).toBe(userId);
            expect(payload?.exp).toBeDefined();
        });
    });

    describe('generateEmailValidationToken', () => {
        test('return a token with exp time, email-validation purpose and the user email', async () => {
            const userEmail = 'user@gmail.com';
            const token = userService['generateEmailValidationToken'](userEmail);
            const payload = jwtService.verify<{ email: string }>(token);
            expect(payload).toBeDefined();
            expect(payload?.purpose).toBe(tokenPurposes.EMAIL_VALIDATION);
            expect(payload?.email).toBe(userEmail);
            expect(payload?.exp).toBeDefined();
        });
    });

    describe('sendEmailValidationLink', () => {
        test('call emailService.sendMail with the user email and link containing web url', async () => {
            const userEmail = 'testEmail';
            await userService['sendEmailValidationLink'](userEmail);
            expect(emailService.sendMail).toHaveBeenCalledWith({
                to: userEmail,
                subject: expect.any(String),
                html: expect.stringContaining(configService.WEB_URL)
            });
        });
    });

    describe('consumeEmailValidationToken', () => {
        describe('Token is not signed by this server', () => {
            test('throw bad request invalid token error', async () => {
                const badJwtService = new JwtService('123-bad-key');
                const { token: badToken } = badJwtService.generate('10m', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: faker.internet.email()
                });
                await expect(userService['consumeEmailValidationToken'](badToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
            });
        });

        describe('Token already expired', () => {
            test('throw bad request invalid token error', async () => {
                const { token: expiredToken } = jwtService.generate('1s', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: faker.internet.email()
                });
                // 1.1 seconds to ensure expiry
                await new Promise((res) => setTimeout(res, 1100));
                await expect(userService['consumeEmailValidationToken'](expiredToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
            });
        });

        describe('Email not in token', () => {
            test('throw bad request invalid token error', async () => {
                const { token: invalidToken } = jwtService.generate('10m', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: undefined
                });
                await expect(userService['consumeEmailValidationToken'](invalidToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
            });
        });

        describe('Session purpose in token', () => {
            test('throw bad request invalid token error', async () => {
                const { token: sessionToken } = jwtService.generate('10m', {
                    purpose: tokenPurposes.SESSION,
                    email: faker.internet.email()
                });
                await expect(userService['consumeEmailValidationToken'](sessionToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
            });
        });

        describe('Unknown purpose in token', () => {
            test('throw bad request invalid token error', async () => {
                const { token: sessionToken } = jwtService.generate('10m', {
                    purpose: 'random-purpose',
                    email: faker.internet.email()
                });
                await expect(userService['consumeEmailValidationToken'](sessionToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
            });
        });

        describe('Token is blacklisted', () => {
            test('throw bad request invalid token error', async () => {
                // send a valid token but mock tokenInBlacklist function to return true
                const { token: validToken } = jwtService.generate('1m', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: faker.internet.email()
                });
                jwtBlacklistService.tokenInBlacklist.mockResolvedValue(true);
                await expect(userService['consumeEmailValidationToken'](validToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
            });

            test('jwtBlacklistService.tokenInBlacklist is called with email-validation token type and jti', async () => {
                // send a valid token
                const { jti, token: validToken } = jwtService.generate('1m', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: faker.internet.email()
                });
                jwtBlacklistService.tokenInBlacklist.mockResolvedValue(true);
                await expect(userService['consumeEmailValidationToken'](validToken))
                    .rejects
                    .toThrow(HttpError.badRequest(authErrors.INVALID_TOKEN));
                expect(jwtBlacklistService.tokenInBlacklist).toHaveBeenCalledWith(JwtTypes.emailValidation, jti);
            });
        });

        describe('Full valid token', () => {
            test('return email in token', async () => {
                // send a valid token
                const emailInToken = faker.internet.email();
                const { token: validToken } = jwtService.generate('1m', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: emailInToken
                });
                // token not in blacklist
                jwtBlacklistService.tokenInBlacklist.mockResolvedValue(false);
                const result = await userService['consumeEmailValidationToken'](validToken);
                expect(result).toBe(emailInToken);
            });

            test('call jwtBlacklistService.blacklist with token type, jti and the remaining TTl', async () => {
                jest.spyOn(Date, 'now').mockReturnValue(Date.now());
                const remainingTTL = 69;

                // send a valid token
                const { jti, token: validToken } = jwtService.generate(`${remainingTTL}s`, {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: faker.internet.email()
                });

                // run
                await userService['consumeEmailValidationToken'](validToken);

                expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                    JwtTypes.emailValidation,
                    jti,
                    remainingTTL,
                );
            });
        });
    });

    describe('setUserDocumentNewProperties', () => {
        describe('Email update', () => {
            describe('Target user is an editor', () => {
                test('downgrade role to "readonly" and emailValidated to false', async () => {
                    const userToUpdate = {
                        role: 'editor',
                        emailValidated: true,
                        email: faker.internet.email(),
                        password: faker.internet.password(),
                        name: faker.internet.username()
                    };
                    const newEmail = faker.internet.email();
                    await userService['setUserDocumentNewProperties'](userToUpdate as any, <UpdateUserValidator>{ email: newEmail });
                    expect(userToUpdate).toStrictEqual({
                        ...userToUpdate,
                        role: 'readonly',
                        email: newEmail,
                        emailValidated: false
                    });
                });
            });

            describe('Target user is readonly', () => {
                test('only the email is modified', async () => {
                    const userToUpdate = {
                        role: 'readonly',
                        emailValidated: false,
                        email: faker.internet.email(),
                        password: faker.internet.password(),
                        name: faker.internet.username()
                    };
                    const newEmail = faker.internet.email();
                    await userService['setUserDocumentNewProperties'](userToUpdate as any, <UpdateUserValidator>{ email: newEmail });
                    expect(userToUpdate).toStrictEqual({
                        ...userToUpdate,
                        email: newEmail,
                    });
                });
            });

            describe('Target user is admin', () => {
                test('only the email is modified', async () => {
                    const userToUpdate = {
                        role: 'admin',
                        emailValidated: true,
                        email: faker.internet.email(),
                        password: faker.internet.password(),
                        name: faker.internet.username()
                    };
                    const newEmail = faker.internet.email();
                    await userService['setUserDocumentNewProperties'](userToUpdate as any, <UpdateUserValidator>{ email: newEmail });
                    expect(userToUpdate).toStrictEqual({
                        ...userToUpdate,
                        email: newEmail,
                    });
                });
            });
        });

        describe('Password update', () => {
            test('call hash function (hashingService) and set hashed password', async () => {
                // hashingService.hash mock
                const hashedPassword = '######';
                const hashMock = hashingService.hash.mockResolvedValue(hashedPassword);
                const userToUpdate = {
                    role: getRandomRole(),
                    emailValidated: true,
                    email: faker.internet.email(),
                    password: faker.internet.password(),
                    name: faker.internet.username()
                };
                const newPassword = faker.internet.password();
                await userService['setUserDocumentNewProperties'](userToUpdate as any, <UpdateUserValidator>{ password: newPassword });
                expect(hashMock).toHaveBeenCalledWith(newPassword);
                expect(userToUpdate).toStrictEqual({
                    ...userToUpdate,
                    password: hashedPassword
                });
            });
        });

        describe('Name update', () => {
            test('only update the name', async () => {
                const userToUpdate = {
                    role: getRandomRole(),
                    emailValidated: true,
                    email: faker.internet.email(),
                    password: faker.internet.password(),
                    name: faker.internet.username()
                };
                const newName = faker.internet.username();
                await userService['setUserDocumentNewProperties'](userToUpdate as any, <UpdateUserValidator>{ name: newName });
                expect(userToUpdate).toStrictEqual({
                    ...userToUpdate,
                    name: newName
                });
            });
        });
    });

    describe('logout', () => {
        test('call jwtBlacklistService.blacklist with token type, jti and the remaining TTl', async () => {
            const nowInSeconds = 10000;
            const remainingTTLInSeconds = 63;
            const fakeExp = nowInSeconds + remainingTTLInSeconds;
            jest.spyOn(Date, 'now').mockReturnValue(nowInSeconds * 1000);

            const requestUserInfo: UserFromRequest = {
                id: '123',
                role: 'readonly',
                jti: 'test-jti',
                tokenExp: fakeExp
            };

            // run
            await userService.logout(requestUserInfo);

            expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                JwtTypes.session,
                requestUserInfo.jti,
                remainingTTLInSeconds
            );
        });
    });
});