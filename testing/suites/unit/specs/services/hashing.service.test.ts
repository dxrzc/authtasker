import { HashingService } from 'src/services/hashing.service';

describe('Hashing Service', () => {
    describe('hash', () => {
        test('return a hashed string', async () => {
            const service = new HashingService(10);
            const result = await service.hash('my-password');
            expect(typeof result).toBe('string');
            expect(result).not.toBe('my-password');
        });

        test('produce different hashes for different inputs', async () => {
            const service = new HashingService(10);
            const hash1 = await service.hash('password1');
            const hash2 = await service.hash('password2');
            expect(hash1).not.toBe(hash2);
        });

        test('produce different hashes for same input due to salting', async () => {
            const service = new HashingService(10);
            const hash1 = await service.hash('repeat-password');
            const hash2 = await service.hash('repeat-password');
            expect(hash1).not.toBe(hash2);
        });
    });

    describe('compare', () => {
        test('return true for valid data and its hash', async () => {
            const service = new HashingService(10);
            const original = 'secure-password';
            const hash = await service.hash(original);
            const result = await service.compare(original, hash);
            expect(result).toBe(true);
        });

        test('return false for invalid data', async () => {
            const service = new HashingService(10);
            const hash = await service.hash('original-password');
            const result = await service.compare('wrong-password', hash);
            expect(result).toBe(false);
        });
    });
});
