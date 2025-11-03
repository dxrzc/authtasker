import bcrypt from 'bcryptjs';

export class HashingService {
    constructor(private readonly saltRounds: number) {}

    async hash(data: string): Promise<string> {
        const salt = await bcrypt.genSalt(this.saltRounds);
        const hash = await bcrypt.hash(data, salt);
        return hash;
    }

    async compare(data: string, hash: string): Promise<boolean> {
        return await bcrypt.compare(data, hash);
    }
}
