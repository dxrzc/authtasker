import { Model, Types } from 'mongoose';
import { mock, MockProxy } from 'jest-mock-extended';
import { JwtTypes } from 'src/enums/jwt-types.enum';
import { JwtService } from 'src/services/jwt.service';
import { IUser } from 'src/interfaces/user/user.interface';
import { LoggerService } from 'src/services/logger.service';
import { ConfigService } from 'src/services/config.service';
import { HttpError } from 'src/common/errors/classes/http-error.class';
import { JwtBlackListService } from 'src/services/jwt-blacklist.service';
import { SessionTokenService } from 'src/services/session-token.service';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { tokenPurposes } from 'src/common/constants/token-purposes.constants';

describe('SessionTokenService', () => {
    let jwtService: JwtService;
    let jwtBlacklistServiceMock: MockProxy<JwtBlackListService>;
    let loggerServiceMock: MockProxy<LoggerService>;
    let userModelMock: { findById: () => { exec: jest.Mock } };
    let configService: Partial<ConfigService>;
    let sessionTokenService: SessionTokenService;

    beforeEach(() => {
        // envs
        configService = {
            JWT_SESSION_PRIVATE_KEY: 'test-123',
            JWT_SESSION_EXP_TIME: '10m',
        };
        jwtService = new JwtService(configService.JWT_SESSION_PRIVATE_KEY!);

        // mocks
        jwtBlacklistServiceMock = mock<JwtBlackListService>();
        loggerServiceMock = mock<LoggerService>();
        userModelMock = {
            findById: () => ({ exec: jest.fn() }),
        };

        sessionTokenService = new SessionTokenService(
            configService as ConfigService,
            jwtService,
            jwtBlacklistServiceMock,
            loggerServiceMock,
            userModelMock as unknown as Model<IUser>,
        );
    });

    describe('blacklist', () => {
        describe('token has already expired', () => {
            test('jwtBlacklistService.blacklist is not called', async () => {
                const expiredTime = Math.floor(Date.now() / 1000) - 60;
                await sessionTokenService.blacklist('test-jti', expiredTime);
                expect(jwtBlacklistServiceMock.blacklist).not.toHaveBeenCalled();
            });
        });

        describe('token has not expired', () => {
            test('call blacklist with session token type, jti and remaining expiration time', async () => {
                const jti = 'test-jti';
                // time
                const nowInSeconds = 10000;
                jest.spyOn(Date, 'now').mockReturnValue(nowInSeconds * 1000);
                const remainingTTLInSeconds = 79;

                await sessionTokenService.blacklist(jti, nowInSeconds + remainingTTLInSeconds);
                expect(jwtBlacklistServiceMock.blacklist).toHaveBeenCalledWith(
                    JwtTypes.session,
                    jti,
                    remainingTTLInSeconds,
                );
            });
        });
    });

    describe('generate', () => {
        test('return a token with exp time, session purpose and the user id', async () => {
            const userId = 'userId12345';
            const token = sessionTokenService.generate(userId);
            const payload = jwtService.verify(token);
            expect(payload).toBeDefined();
            expect(payload?.purpose).toBe(tokenPurposes.SESSION);
            expect(payload?.id).toBe(userId);
            expect(payload?.exp).toBeDefined();
        });
    });

    describe('consume', () => {
        beforeEach(() => {
            // User is always found unless stated otherwise
            userModelMock.findById().exec.mockResolvedValue({});
            // Token is not blacklisted unless stated otherwise
            jwtBlacklistServiceMock.tokenInBlacklist.mockResolvedValue(false);
        });

        describe('Token purpose is not the expected', () => {
            describe('The purpose is email validation', () => {
                test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                    const { token: tokenWithBadPurpose } = jwtService.generate('10m', {
                        id: new Types.ObjectId(),
                        purpose: tokenPurposes.EMAIL_VALIDATION,
                    });
                    await expect(sessionTokenService.consume(tokenWithBadPurpose)).rejects.toThrow(
                        HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                    );
                });
            });

            describe('The purpose is an unknown purpose', () => {
                test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                    const { token: tokenWithBadPurpose } = jwtService.generate('10m', {
                        id: new Types.ObjectId(),
                        purpose: 'unknown-purpose',
                    });
                    await expect(sessionTokenService.consume(tokenWithBadPurpose)).rejects.toThrow(
                        HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                    );
                });
            });
        });

        describe('Token is not signed by this server', () => {
            test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                const newJwtService = new JwtService('bad-key-123');
                const { token: invalidToken } = newJwtService.generate('10m', {
                    id: new Types.ObjectId(),
                    purpose: tokenPurposes.SESSION,
                });
                await expect(sessionTokenService.consume(invalidToken)).rejects.toThrow(
                    HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                );
            });
        });

        describe('Token has expired', () => {
            test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                jest.spyOn(Date, 'now').mockReturnValue(Date.now() + 1000000);
                const { token: expiredToken } = jwtService.generate('1s', {
                    id: new Types.ObjectId(),
                    purpose: tokenPurposes.SESSION,
                });
                await expect(sessionTokenService.consume(expiredToken)).rejects.toThrow(
                    HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                );
            });
        });

        describe('User id not in token', () => {
            test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                const { token: incompleteToken } = jwtService.generate('10m', {
                    id: undefined,
                    purpose: tokenPurposes.SESSION,
                });
                await expect(sessionTokenService.consume(incompleteToken)).rejects.toThrow(
                    HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                );
            });
        });

        describe('User in token not found', () => {
            test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                const { token: orphanToken } = jwtService.generate('10m', {
                    id: new Types.ObjectId(),
                    purpose: tokenPurposes.SESSION,
                });
                // mock: user is not found
                userModelMock.findById().exec.mockResolvedValue(null);
                await expect(sessionTokenService.consume(orphanToken)).rejects.toThrow(
                    HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                );
            });
        });

        describe('User is blacklisted', () => {
            test('throw HttpError UNAUTHORIZED and INVALID_TOKEN error', async () => {
                const { token: blacklistedToken } = jwtService.generate('10m', {
                    id: new Types.ObjectId(),
                    purpose: tokenPurposes.SESSION,
                });
                // mock: token is in blacklist
                jwtBlacklistServiceMock.tokenInBlacklist.mockResolvedValue(true);
                await expect(sessionTokenService.consume(blacklistedToken)).rejects.toThrow(
                    HttpError.unAuthorized(authErrors.INVALID_TOKEN),
                );
            });
        });
    });
});
