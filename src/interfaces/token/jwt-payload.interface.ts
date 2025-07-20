import { JwtPayload } from "jsonwebtoken";
import { tokenPurposes } from '@root/common/constants/token-purposes.constants';

export interface IJwtPayload extends JwtPayload {
    jti: string;
    purpose: typeof tokenPurposes[keyof typeof tokenPurposes];
}