import { mock } from 'jest-mock-extended';
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { makeSessionTokenBlacklistKey } from '@logic/token/make-session-token-blacklist-key';
import { makeEmailValidationBlacklistKey } from '@logic/token/make-email-validation-token-blacklist-key';
import { RedisService } from '@root/services/redis.service';
import { JwtTypes } from '@root/enums/jwt-types.enum';

const redisServiceMock = mock<RedisService>();
const service = new JwtBlackListService(redisServiceMock);

describe('JwtBlackListService', () => {
    describe('blacklist', () => {
        test.concurrent.each([
            { tokenType: JwtTypes.session, keyGenerator: makeSessionTokenBlacklistKey },
            { tokenType: JwtTypes.emailValidation, keyGenerator: makeEmailValidationBlacklistKey },
        ])('when token is a $tokenType token call redisService.set() with the right key, "1", and the exp time', async ({ tokenType, keyGenerator }) => {
            const expTime = 360;
            const jti = 'tokenJti';
            await service.blacklist(tokenType, jti, expTime);
            expect(redisServiceMock.set).toHaveBeenCalledWith(
                keyGenerator(jti),
                '1',
                expTime
            );
        });
    });

    describe('tokenInBlacklist', () => {
        describe('redisServiceMock.get() returns null', () => {
            test.concurrent('return false', async () => {
                redisServiceMock.get.mockResolvedValueOnce(null);
                const result = await service.tokenInBlacklist(JwtTypes.session, 'test-jti');
                expect(result).toBe(false);
            });
        });

        describe('redisServiceMock.get() returns a non-null value', () => {
            test.concurrent('return true', async () => {
                redisServiceMock.get.mockResolvedValueOnce('Abc123$');
                const result = await service.tokenInBlacklist(JwtTypes.session, 'test-jti');
                expect(result).toBe(true);
            });
        });
    });
});
