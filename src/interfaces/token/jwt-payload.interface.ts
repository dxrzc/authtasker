import { tokenPurposes } from '@root/common/constants';
import { JwtPayload } from "jsonwebtoken";

export interface IJwtPayload extends JwtPayload {
    jti: string;
    purpose: typeof tokenPurposes[keyof typeof tokenPurposes];
}