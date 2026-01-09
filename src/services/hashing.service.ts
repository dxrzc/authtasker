import bcrypt from 'bcrypt';
import crypto from 'crypto';

export class HashingService {
    constructor(private readonly saltRounds: number) {}

    /**
     * Pre hashes the input using SHA-256 HMAC with the provided pepper.
     * This is not intended to be a secure hash by itself, but rather a preprocessing step before any stronger hashing.
     * @param input string to be hashed
     * @param pepper pepper value for HMAC
     * @returns SHA-256 HMAC of the input as a Buffer
     */
    computeSHA256HMACpreHash(input: string, pepper: string): Buffer {
        const hmac = crypto.createHmac('sha256', pepper).update(input).digest();
        return hmac;
    }

    async hash(data: string | Buffer): Promise<string> {
        const salt = await bcrypt.genSalt(this.saltRounds);
        const hash = await bcrypt.hash(data, salt);
        return hash;
    }

    async compare(data: string | Buffer, hash: string): Promise<boolean> {
        return await bcrypt.compare(data, hash);
    }
}
