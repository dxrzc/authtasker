import { faker } from '@faker-js/faker/.';
import { mock, MockProxy } from 'jest-mock-extended';
import { JwtTypes } from '@root/enums/jwt-types.enum';
import { JwtService } from '@root/services/jwt.service';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { tokenPurposes } from '@root/common/constants/token-purposes.constants';
import { EmailValidationTokenService } from '@root/services/email-validation-token.service';

describe('EmailValidationTokenService', () => {
    let jwtService: JwtService;
    let jwtBlacklistService: MockProxy<JwtBlackListService>
    let loggerService: MockProxy<LoggerService>    
    let configService: Partial<ConfigService>;
    let emailValidationTokenService: EmailValidationTokenService;

    beforeEach(() => {
        // envs
        configService = {
            JWT_SESSION_PRIVATE_KEY: 'test-123',
            JWT_EMAIL_VALIDATION_EXP_TIME: '5m',
        }
        jwtService = new JwtService(configService.JWT_SESSION_PRIVATE_KEY!);

        // mocks
        jwtBlacklistService = mock<JwtBlackListService>();
        loggerService = mock<LoggerService>();

        emailValidationTokenService = new EmailValidationTokenService(
            configService as ConfigService,
            jwtService,
            jwtBlacklistService,
            loggerService,
        );
    });

    describe('generate', () => {
        test('return a token with exp time, email-validation purpose and the user email', async () => {
            const userEmail = 'user@gmail.com';
            const token = emailValidationTokenService.generate(userEmail);
            const payload = jwtService.verify<{ email: string }>(token);
            expect(payload).toBeDefined();
            expect(payload?.purpose).toBe(tokenPurposes.EMAIL_VALIDATION);
            expect(payload?.email).toBe(userEmail);
            expect(payload?.exp).toBeDefined();
        });
    });

    describe('blacklist', () => {
        describe('Token has expired', () => {
            test('jwtBlacklistService.blacklist is not called', async () => {
                const expiredTime = Math.floor(Date.now() / 1000) - 60;
                await emailValidationTokenService.blacklist('test-jti', expiredTime);
                expect(jwtBlacklistService.blacklist).not.toHaveBeenCalled();
            });
        });

        describe('Token has not expired', () => {
            test('calls blacklist with email-validation token type, jti and remaining expiration time', async () => {
                const jti = 'test-jti';
                // time
                const nowInSeconds = 10000;
                jest.spyOn(Date, 'now').mockReturnValue(nowInSeconds * 1000);
                const remainingTTLInSeconds = 79;

                await emailValidationTokenService.blacklist(jti, nowInSeconds + remainingTTLInSeconds);
                expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                    JwtTypes.emailValidation,
                    jti,
                    remainingTTLInSeconds
                );
            });
        });
    });

    describe('consume', () => {
        describe('Token is not signed by this server', () => {
            test('throw bad request invalid token error', async () => {
                const badJwtService = new JwtService('123-bad-key');
                const { token: badToken } = badJwtService.generate('10m', {
                    purpose: tokenPurposes.EMAIL_VALIDATION,
                    email: faker.internet.email()
                });
                await expect(emailValidationTokenService.consume(badToken))
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
                await expect(emailValidationTokenService.consume(expiredToken))
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
                await expect(emailValidationTokenService.consume(invalidToken))
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
                await expect(emailValidationTokenService.consume(sessionToken))
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
                await expect(emailValidationTokenService.consume(sessionToken))
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
                await expect(emailValidationTokenService.consume(validToken))
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
                await expect(emailValidationTokenService.consume(validToken))
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
                const result = await emailValidationTokenService.consume(validToken);
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
                await emailValidationTokenService.consume(validToken);

                expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                    JwtTypes.emailValidation,
                    jti,
                    remainingTTL,
                );
            });
        });
    });
});