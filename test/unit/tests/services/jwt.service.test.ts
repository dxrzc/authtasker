import { JwtService } from 'src/services/jwt.service';
import jwt from 'jsonwebtoken';

const PRIVATE_KEY = 'my-secret-key';
const jwtService = new JwtService(PRIVATE_KEY);

describe('JwtService', () => {
    describe('generate', () => {
        test('return an object containing the token as a string', () => {
            const { token } = jwtService.generate('1h', { userId: '123' });
            expect(typeof token).toBe('string');
        });

        test('return an object containing the token jti', () => {
            const { jti, token } = jwtService.generate('1h', { userId: '123' });
            const payload = jwtService.verify(token);
            expect(payload?.jti).toBe(jti);
        });

        test('generate a token that can be verified by verify()', () => {
            const payload = { userId: 'xyz' };
            const { token } = jwtService.generate('1h', payload);

            const result = jwtService.verify<typeof payload>(token);
            expect(result?.userId).toBe('xyz');
            expect(result?.jti).toBeDefined();
        });

        test('embed a jti (JWT ID) in the payload', () => {
            const payload = { userId: 'abc' };
            const { token } = jwtService.generate('1h', payload);

            const decoded = jwt.verify(token, PRIVATE_KEY) as any;
            expect(decoded.userId).toBe('abc');
            expect(decoded.jti).toBeDefined();
        });
    });

    describe('verify', () => {
        test('return decoded payload if token is valid', () => {
            const token = jwt.sign({ foo: 'bar' }, PRIVATE_KEY, { expiresIn: '1h' });
            const result = jwtService.verify<{ foo: string }>(token);
            expect(result).toMatchObject({ foo: 'bar' });
        });

        test('return null if token is invalid', () => {
            const invalidToken = 'not.a.valid.token';
            const result = jwtService.verify(invalidToken);
            expect(result).toBeNull();
        });

        test('return null if token is expired', () => {
            // expired 10 seconds ago
            const expiredToken = jwt.sign({ exp: Math.floor(Date.now() / 1000) - 10 }, PRIVATE_KEY);
            const result = jwtService.verify(expiredToken);
            expect(result).toBeNull();
        });
    });
});
