import { IJwtPayload } from "@root/interfaces/token/jwt-payload.interface";
import jwt from "jsonwebtoken";
import { v4 as uuidv4 } from 'uuid';

export class JwtService {

    constructor(
        private readonly privateKey: string,
    ) {}

    generate(expirationTime: string, payload: object): string {
        Object.defineProperty(
            payload,
            'jti',
            { value: uuidv4(), enumerable: true }
        );

        const token = jwt.sign(payload,
            this.privateKey,
            { expiresIn: expirationTime as `${number}${'h' | 'd' | 'm'}` }
        );
        return token;
    }

    verify<T>(token: string): IJwtPayload & T | null {
        try {
            const payload = jwt.verify(token, this.privateKey);
            return payload as any;
        } catch (error) {
            return null;
        }
    }
}