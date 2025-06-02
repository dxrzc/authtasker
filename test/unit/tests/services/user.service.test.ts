import { Model, Query } from "mongoose";
import { mock, MockProxy } from "jest-mock-extended";
import { ITasks, IUser } from "@root/interfaces";
import { ConfigService, EmailService, HashingService, JwtBlackListService, JwtService, LoggerService, UserService } from "@root/services";
import { validRoles } from "@root/types/user";
import { modificationAuthFixture } from "./fixtures";
import { MongooseModel, NoReadonly } from "@unit/utils/types";
import { TOKEN_PURPOSES } from "@root/rules/constants";
import { HttpError } from "@root/rules/errors/http.error";
import { v4 as uuidv4 } from 'uuid';

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
    describe('getTargetUserIfAuthorized', () => {
        test.each([
            validRoles
        ])('%s users are authorized to modify themselves', async (role) => {
            const requestUser = {
                id: 'testId',
                role: role
            };

            const userToModify = {
                id: requestUser.id,
                role: requestUser.role
            };

            const findOneMock = jest.spyOn(userService, 'findOne').mockResolvedValue(userToModify as any);
            const result = await userService['getTargetUserIfAuthorized'](requestUser, userToModify.id);

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
            const result = await userService['getTargetUserIfAuthorized'](requestUser, userToModify.id);

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
            const sessionPurpose = TOKEN_PURPOSES.SESSION;
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
            const emailValidationPurpose = TOKEN_PURPOSES.EMAIL_VALIDATION;
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
                    purpose: TOKEN_PURPOSES.EMAIL_VALIDATION,
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
                    purpose: TOKEN_PURPOSES.EMAIL_VALIDATION,
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
                purpose: TOKEN_PURPOSES.EMAIL_VALIDATION,
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

    describe('requestEmailValidation', () => {
        describe('User is not found', () => {
            test('throw BAD REQUEST Http error', async () => {
                userModel.findById().exec.mockResolvedValue(null);
                try {
                    await userService.requestEmailValidation('testID');
                } catch (err: any) {
                    expect(err).toBeInstanceOf(HttpError);
                    expect(err.statusCode).toBe(400);
                    expect(typeof err.message).toBe('string')
                }
            });

            test('error logger is called with the user id', async () => {
                userModel.findById().exec.mockResolvedValue(null);
                const userId = 'testID';
                await expect(userService.requestEmailValidation(userId)).rejects.toThrow();
                expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining(userId));
            });
        });

        describe('User email is already validated', () => {
            test('throw BAD REQUEST Http error', async () => {
                userModel.findById().exec.mockResolvedValue({ emailValidated: true });
                try {
                    await userService.requestEmailValidation('testID');
                } catch (err: any) {
                    expect(err).toBeInstanceOf(HttpError);
                    expect(err.statusCode).toBe(400);
                    expect(typeof err.message).toBe('string')
                }
            });

            test('error logger is called with the user emial', async () => {
                const userEmail = 'test@example.com';
                userModel.findById().exec.mockResolvedValue({ emailValidated: true, email: userEmail });
                await expect(userService.requestEmailValidation('testId')).rejects.toThrow();
                expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining(userEmail));
            });
        });

        test('sendEmailValidationLink is called with the user email', async () => {
            const testEmail = 'testEmail';
            userModel.findById().exec.mockResolvedValue({ emailValidated: false, email: testEmail });
            const sendEmailValidationLinkMock = jest.spyOn(userService as any, 'sendEmailValidationLink')
                .mockImplementation();
            await userService.requestEmailValidation('testID');
            expect(sendEmailValidationLinkMock).toHaveBeenCalledWith(testEmail);
        });
    });

    // describe('confirmEmailValidation', () => {

    // });
});