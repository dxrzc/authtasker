import jwt from 'jsonwebtoken';
import { JwtService } from '@root/services';

const PRIVATE_KEY = 'my-secret-key';
let jwtService = new JwtService(PRIVATE_KEY)

describe('JwtService', () => {
    describe('generate', () => {
        test.concurrent('return an object containing the token as a string', () => {
            const { token } = jwtService.generate('1h', { userId: '123' });
            expect(typeof token).toBe('string');
        });

        test.concurrent('return an object containing the token jti', async () => {
            const { jti, token } = jwtService.generate('1h', { userId: '123' });
            const payload = jwtService.verify(token);
            expect(payload?.jti).toBe(jti);
        });

        test.concurrent('generate a token that can be verified by verify()', () => {
            const payload = { userId: 'xyz' };
            const { token } = jwtService.generate('1h', payload);

            const result = jwtService.verify<typeof payload>(token);
            expect(result?.userId).toBe('xyz');
            expect(result?.jti).toBeDefined();
        });

        test.concurrent('embed a jti (JWT ID) in the payload', () => {
            const payload = { userId: 'abc' };
            const { token } = jwtService.generate('1h', payload);

            const decoded = jwt.verify(token, PRIVATE_KEY) as any;
            expect(decoded.userId).toBe('abc');
            expect(decoded.jti).toBeDefined();
        });
    });

    describe('verify', () => {
        test.concurrent('return decoded payload if token is valid', () => {
            const token = jwt.sign({ foo: 'bar' }, PRIVATE_KEY, { expiresIn: '1h' });
            const result = jwtService.verify<{ foo: string }>(token);
            expect(result).toMatchObject({ foo: 'bar' });
        });

        test.concurrent('return null if token is invalid', () => {
            const invalidToken = 'not.a.valid.token';
            const result = jwtService.verify(invalidToken);
            expect(result).toBeNull();
        });

        test.concurrent('return null if token is expired', async () => {
            // expired 10 seconds ago
            const expiredToken = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, PRIVATE_KEY);
            const result = jwtService.verify(expiredToken);
            expect(result).toBeNull();
        });
    });
});
