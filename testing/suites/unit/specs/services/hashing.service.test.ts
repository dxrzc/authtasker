import { HashingService } from 'src/services/hashing.service';
import crypto from 'crypto';

describe('Hashing Service', () => {
    describe('computeSHA256HMACpreHash', () => {
        test('return a Buffer', () => {
            const service = new HashingService(10);
            const result = service.computeSHA256HMACpreHash('test-input', 'test-pepper');
            expect(Buffer.isBuffer(result)).toBe(true);
        });

        test('produce a 32-byte SHA-256 HMAC', () => {
            const service = new HashingService(10);
            const result = service.computeSHA256HMACpreHash('test-input', 'test-pepper');
            expect(result.length).toBe(32); // SHA-256 produces 32 bytes
        });

        test('produce different HMACs for different inputs', () => {
            const service = new HashingService(10);
            const hmac1 = service.computeSHA256HMACpreHash('input1', 'pepper');
            const hmac2 = service.computeSHA256HMACpreHash('input2', 'pepper');
            expect(hmac1.equals(hmac2)).toBe(false);
        });

        test('produce different HMACs for different peppers', () => {
            const service = new HashingService(10);
            const hmac1 = service.computeSHA256HMACpreHash('input', 'pepper1');
            const hmac2 = service.computeSHA256HMACpreHash('input', 'pepper2');
            expect(hmac1.equals(hmac2)).toBe(false);
        });

        test('produce consistent HMAC for same input and pepper', () => {
            const service = new HashingService(10);
            const hmac1 = service.computeSHA256HMACpreHash('consistent', 'pepper');
            const hmac2 = service.computeSHA256HMACpreHash('consistent', 'pepper');
            expect(hmac1.equals(hmac2)).toBe(true);
        });

        test('match raw Node.js crypto HMAC output', () => {
            const service = new HashingService(10);
            const input = 'verify-correctness';
            const pepper = 'secret-pepper';
            const serviceResult = service.computeSHA256HMACpreHash(input, pepper);
            const expectedResult = crypto.createHmac('sha256', pepper).update(input).digest();
            expect(serviceResult.equals(expectedResult)).toBe(true);
        });
    });

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
