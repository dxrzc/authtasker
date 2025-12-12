import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class HashingService {
    constructor(private readonly saltRounds: number) {}

    // Pre-hash with HMAC-SHA256.
    // Not intended to be the only hashing step for passwords. (CodeQL)
    computeSHA256HMACpreHash(input: string, pepper: string) {
        const hmac = crypto.createHmac('sha256', pepper).update(input).digest('hex');
        return hmac;
    }

    async hash(data: string): Promise<string> {
        const salt = await bcrypt.genSalt(this.saltRounds);
        const hash = await bcrypt.hash(data, salt);
        return hash;
    }

    async compare(data: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(data, hash);
    }
}
