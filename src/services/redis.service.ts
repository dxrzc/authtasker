import Redis from 'ioredis';

export class RedisService {
    constructor(private readonly redis: Redis) {}

    async set(key: string, data: string | number | object, expirationTime?: number): Promise<void> {
        if (typeof data === 'object') data = JSON.stringify(data);
        expirationTime
            ? await this.redis.set(key, data, "EX", expirationTime)
            : await this.redis.set(key, data)                        
    }

    async get<T>(key: string): Promise<T | null> {
        const data = await this.redis.get(key);
        if (data) {
            try {
                return JSON.parse(data);
            } catch (error) {
                return data as T;
            }
        }
        return null;
    }

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}