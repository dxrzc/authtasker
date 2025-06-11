import { mock } from 'jest-mock-extended';
import { JwtBlackListService, RedisService } from '@root/services';

describe('JwtBlackListService', () => {
    const redisServiceMock = mock<RedisService>();
    const service = new JwtBlackListService(redisServiceMock);

    test('TODO:', async () => {
        
    });
});
