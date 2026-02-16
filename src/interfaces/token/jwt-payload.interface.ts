import { JwtPayload } from 'jsonwebtoken';
import { tokenPurposes } from 'src/constants/token-purposes.constants';

export interface IJwtPayload extends JwtPayload {
    readonly jti: string;
    readonly purpose: (typeof tokenPurposes)[keyof typeof tokenPurposes];
}
