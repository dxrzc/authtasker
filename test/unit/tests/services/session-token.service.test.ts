import { Model } from 'mongoose';
import { mock, MockProxy } from 'jest-mock-extended';
import { JwtTypes } from '@root/enums/jwt-types.enum';
import { JwtService } from '@root/services/jwt.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { LoggerService } from '@root/services/logger.service';
import { ConfigService } from '@root/services/config.service';
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { SessionTokenService } from '@root/services/session-token.service';
import { tokenPurposes } from '@root/common/constants/token-purposes.constants';

describe('SessionTokenService', () => {
    let jwtService: JwtService;
    let jwtBlacklistService: MockProxy<JwtBlackListService>
    let loggerService: MockProxy<LoggerService>
    let userModel: MockProxy<Model<IUser>>;
    let sessionTokenService: SessionTokenService;
    let configService: Partial<ConfigService>;

    beforeEach(() => {
        // envs
        configService = {
            JWT_PRIVATE_KEY: 'test-123',
            JWT_SESSION_EXP_TIME: '10m',
        };
        
        jwtService = new JwtService(configService.JWT_PRIVATE_KEY!);

        // mocks
        jwtBlacklistService = mock<JwtBlackListService>();
        loggerService = mock<LoggerService>();
        userModel = mock<Model<IUser>>();
        
        sessionTokenService = new SessionTokenService(
            configService as ConfigService,
            jwtService,
            jwtBlacklistService,
            loggerService,
            userModel,
        );
    });

    describe('blacklist', () => {
        describe('Token has already expired', () => {
            test('jwtBlacklistService.blacklist is not called', async () => {
                const expiredTime = Math.floor(Date.now() / 1000) - 60;
                await sessionTokenService.blacklist('test-jti', expiredTime);
                expect(jwtBlacklistService.blacklist).not.toHaveBeenCalled();
            });
        });

        describe('Token has not expired', () => {
            test('call blacklist with session token type, jti and remaining expiration time', async () => {
                const jti = 'test-jti';
                // time
                const nowInSeconds = 10000;
                jest.spyOn(Date, 'now').mockReturnValue(nowInSeconds * 1000);
                const remainingTTLInSeconds = 79;

                await sessionTokenService.blacklist(jti, nowInSeconds + remainingTTLInSeconds);
                expect(jwtBlacklistService.blacklist).toHaveBeenCalledWith(
                    JwtTypes.session,
                    jti,
                    remainingTTLInSeconds
                );
            });
        });
    });

    describe('generateSessionToken', () => {
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
});