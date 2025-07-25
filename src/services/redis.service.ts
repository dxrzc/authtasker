import Redis from 'ioredis';

export class RedisService {
    constructor(private readonly redis: Redis) {}

    async set(key: string, data: string | number | object, expirationTimeInSeconds?: number): Promise<void> {
        if (typeof data === 'object') data = JSON.stringify(data);
        expirationTimeInSeconds
            ? await this.redis.set(key, data, "EX", expirationTimeInSeconds)
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

    async addToSet(key: string, member: string): Promise<void> {
        await this.redis.sadd(key, member);
    }

    async deleteFromSet(key: string, member: string): Promise<void> {
        await this.redis.srem(key, member);
    }

    async belongsToSet(key: string, member: string): Promise<boolean> {
        return (await this.redis.sismember(key, member) === 1);
    }

    async getAllSetMembers(key: string): Promise<Array<string>> {
        return await this.redis.smembers(key);
    }

    async getSetSize(key: string): Promise<number> {
        return await this.redis.scard(key);
    }

    async getAllKeysByPattern(pattern: string): Promise<string[]> {
        const keys = await this.redis.keys(pattern);
        return keys;
    }

    async delete(key: string): Promise<void> {
        await this.redis.del(key);
    }
}