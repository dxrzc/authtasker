import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import { IJwtPayload } from 'src/interfaces/token/jwt-payload.interface';

export class JwtService {
    constructor(private readonly privateKey: string) {}

    generate(expirationTime: string, payload: object): { token: string; jti: string } {
        const jti = uuidv4();
        Object.defineProperty(payload, 'jti', { value: jti, enumerable: true });

        const token = jwt.sign(payload, this.privateKey, {
            expiresIn: expirationTime as `${number}${'h' | 'd' | 'm'}`,
        });

        return { token, jti };
    }

    verify<T>(token: string): (IJwtPayload & T) | null {
        try {
            const payload = jwt.verify(token, this.privateKey);
            return payload as any;
            // eslint-disable-next-line @typescript-eslint/no-unused-vars
        } catch (error) {
            return null;
        }
    }
}
