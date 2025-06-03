import { mock } from 'jest-mock-extended';
import { JwtBlackListService, RedisService } from '@root/services';

describe('JwtBlackListService', () => {
    const redisServiceMock = mock<RedisService>();
    const service = new JwtBlackListService(redisServiceMock);

    describe('blacklist', () => {
        it('should store jti in Redis with expiration time', async () => {
            await service.blacklist('token-id-123', 3600);
            expect(redisServiceMock.set).toHaveBeenCalledWith('token-id-123', 'blacklisted', 3600);
        });
    });

    describe('isBlacklisted', () => {
        it('should return true if token jti is blacklisted', async () => {
            redisServiceMock.get.mockResolvedValue('blacklisted');
            const result = await service.isBlacklisted('token-id-123');
            expect(result).toBe(true);
        });

        it('should return false if token jti is not blacklisted', async () => {
            redisServiceMock.get.mockResolvedValue(null);
            const result = await service.isBlacklisted('token-id-456');
            expect(result).toBe(false);
        });
    });
});
