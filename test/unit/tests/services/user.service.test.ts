import { Model, Query } from "mongoose";
import { mock, MockProxy } from "jest-mock-extended";
import { ITasks, IUser, UserFromRequest } from "@root/interfaces";
import { ConfigService, EmailService, HashingService, JwtBlackListService, JwtService, LoggerService, UserService } from "@root/services";
import { validRoles } from "@root/types/user";
import { modificationAuthFixture } from "./fixtures";
import { MongooseModel, NoReadonly } from "@unit/utils/types";
import { HttpError } from "@root/common/errors/classes/http-error.class";
import { v4 as uuidv4 } from 'uuid';
import { getRandomRole } from "@unit/utils/get-random-role.util";
import { faker } from "@faker-js/faker/.";
import { tokenPurposes } from '@root/common/constants';
import { UpdateUserValidator } from '@root/validators/models/user';

let configService: MockProxy<NoReadonly<ConfigService>>;
let userModel: MockProxy<MongooseModel<Model<IUser>>>;
let tasksModel: MockProxy<MongooseModel<Model<ITasks>>>;
let hashingService: MockProxy<HashingService>;
let jwtService: MockProxy<JwtService>;
let jwtBlacklistService: MockProxy<JwtBlackListService>;
let loggerService: MockProxy<LoggerService>;
let emailService: MockProxy<EmailService>;
let userService: UserService;

beforeEach(() => {
    configService = mock<ConfigService>();
    userModel = mock<Model<IUser>>() as any;
    tasksModel = mock<Model<ITasks>>() as any;
    hashingService = mock<HashingService>();
    jwtService = mock<JwtService>();
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

    // this allows, for example, findOne().exec() to be a mock...
    userModel.find.mockReturnValue(mock<Query<any, any>>());
    userModel.findOne.mockReturnValue(mock<Query<any, any>>());
    userModel.findById.mockReturnValue(mock<Query<any, any>>());
    userModel.findByIdAndDelete.mockReturnValue(mock<Query<any, any>>());
    userModel.findByIdAndUpdate.mockReturnValue(mock<Query<any, any>>());
});

describe('User Service', () => {
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

    describe('blackListToken', () => {
        test('call blacklist(blacklistService) with jti the token TTL', async () => {
            const testJti = 'testJti';
            const expiresIn = 50; // seconds
            const tokenTTL = Math.floor((Date.now() / 1000) + expiresIn);

            await userService['blackListToken'](testJti, tokenTTL);

            const [arg1, arg2] = jwtBlacklistService.blacklist.mock.calls[0];
            expect(arg1).toBe(testJti);
            expect(Math.abs(arg2 - expiresIn)).toBeLessThanOrEqual(1); // minor delays
        });
    });

    describe('generateSessionToken', () => {
        test('call generate(jwtService) with the exp time, user id and session purpose', async () => {
            const expirationTimeConfig = '10h';
            const userId = 'userId123';
            const sessionPurpose = tokenPurposes.SESSION;
            configService.JWT_SESSION_EXP_TIME = expirationTimeConfig;

            userService['generateSessionToken'](userId);

            expect(jwtService.generate).toHaveBeenCalledWith(expirationTimeConfig, {
                id: userId,
                purpose: sessionPurpose
            });
        });

        test('return the token generated', async () => {
            const testToken = 'abc123';
            jwtService.generate.mockReturnValue(testToken);
            const token = userService['generateSessionToken']('userId');
            expect(token).toBe(testToken);
        });

        test('info logger is called with token exp time', async () => {
            const expirationTimeConfig = '10h';
            configService.JWT_SESSION_EXP_TIME = expirationTimeConfig;
            userService['generateSessionToken']('123');
            expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining(expirationTimeConfig));
        });
    });

    describe('sendEmailValidationLink', () => {
        test('call generate token function (jwtService) with the exp time, provided email and email valid. purpose', async () => {
            const userEmail = 'testEmail';
            const emailValidationPurpose = tokenPurposes.EMAIL_VALIDATION;
            await userService['sendEmailValidationLink'](userEmail);
            expect(jwtService.generate).toHaveBeenCalledWith(configService.JWT_EMAIL_VALIDATION_EXP_TIME, {
                purpose: emailValidationPurpose,
                email: userEmail
            });
        });

        test('calls sendMail function (emailService) with the email and the link in the html', async () => {
            const userEmail = 'testEmail';
            const webUrl = 'test_url';
            configService.WEB_URL = webUrl;
            await userService['sendEmailValidationLink'](userEmail);
            expect(emailService.sendMail).toHaveBeenCalledWith({
                to: userEmail,
                subject: 'Email validation',
                html: expect.stringContaining(webUrl)
            })
        });

        test('info logger is called with the email', async () => {
            const userEmail = 'testEmail';
            await userService['sendEmailValidationLink'](userEmail);
            expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining(userEmail));
        });
    });

    describe('consumeEmailValidationToken', () => {
        describe('Token is invalid (expired, not signed by the server)', () => {
            test('throw BAD REQUEST Http error and call error logger', async () => {
                // verify returns null
                jwtService.verify.mockReturnValue(null);
                try {
                    await userService['consumeEmailValidationToken']('test-token');
                } catch (err: any) {
                    expect(err).toBeInstanceOf(HttpError);
                    expect(err.statusCode).toBe(400);
                    expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining('server'));
                }
            });
        });

        describe('Token does not contain an email', () => {
            test('throws BAD REQUEST HttpError and logs error', async () => {
                // token verified but email not in payload
                jwtService.verify.mockReturnValue({
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    jti: uuidv4()
                });
                try {
                    await userService['consumeEmailValidationToken']('test-token');
                } catch (err: any) {
                    expect(err).toBeInstanceOf(HttpError);
                    expect(err.statusCode).toBe(400);
                    expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining('mail'));
                }
            });
        });

        describe('Token does not have the correct purpose', () => {
            test('throws BAD REQUEST HttpError and logs error', async () => {
                // token verified but payload does not contain the expected purpose
                jwtService.verify.mockReturnValue({
                    purpose: 'email_validationn' as any,
                    jti: uuidv4(),
                    email: 'test@gmail.com'
                });
                try {
                    await userService['consumeEmailValidationToken']('test-token');
                } catch (err: any) {
                    expect(err).toBeInstanceOf(HttpError);
                    expect(err.statusCode).toBe(400);
                    expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining('purpose'));
                }
            });
        });

        describe('Token is blacklisted', () => {
            test('throws BAD REQUEST HttpError and logs error', async () => {
                // valid but blacklisted token
                jwtBlacklistService.isBlacklisted.mockResolvedValue(true);
                jwtService.verify.mockReturnValue({
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    jti: uuidv4(),
                    email: 'test@gmail.com'
                });

                try {
                    await userService['consumeEmailValidationToken']('test-token');
                } catch (err: any) {
                    expect(err).toBeInstanceOf(HttpError);
                    expect(err.statusCode).toBe(400);
                    expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining('blacklist'));
                }
            });
        });

        test('return email in payload and call blackListToken with jti and exp', async () => {
            const testJti = uuidv4();
            const testExp = 100;
            const testEmail = 'test@gmail.com'
            // full valid and non-blacklisted token
            jwtBlacklistService.isBlacklisted.mockResolvedValue(false);
            jwtService.verify.mockReturnValue({
                purpose: tokenPurposes.EMAIL_VALIDATION,
                jti: testJti,
                email: testEmail,
                exp: testExp
            });
            const blacklistMock = jest.spyOn(userService as any, 'blackListToken')
                .mockImplementation();

            const email = await userService['consumeEmailValidationToken']('test-token');
            expect(blacklistMock).toHaveBeenCalledWith(testJti, testExp);
            expect(email).toBe(testEmail);
        });
    });

    describe('setUserDocumentNewProperties', () => {
        describe('Email update', () => {
            test('downgrade role and emailValidated property for editors', async () => {
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

            test('nothing changed for readonlys (only the email)', async () => {
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

            test('no modifications for admins (only the email)', async () => {
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
            test('just update the name with no extra modifications', async () => {
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
        test('call blacklistToken with the token jti and exp', async () => {
            const blacklistTokenMock = jest.spyOn(userService as any, 'blackListToken')
                .mockImplementation();
            const reqUserInfo: UserFromRequest = {
                id: '12345',
                role: 'readonly',
                jti: 'test-jti',
                tokenExp: 3133913,
            };
            await userService.logout(reqUserInfo);
            expect(blacklistTokenMock).toHaveBeenCalledWith(reqUserInfo.jti, reqUserInfo.tokenExp);
        });

        test('info logger is called with user id', async () => {
            const reqUserInfo: UserFromRequest = {
                id: '12345',
                role: 'editor',
                jti: 'test-jti',
                tokenExp: 3133913,
            };
            await userService.logout(reqUserInfo);
            expect(loggerService.info).toHaveBeenCalledWith(expect.stringContaining(reqUserInfo.id));
        });
    });
});