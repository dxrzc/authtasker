import { UserSessionInfo } from 'src/interfaces/user/user-session-info.interface';
import { Request } from 'express';

export function userInfoInReq(req: Request & Partial<UserSessionInfo>): UserSessionInfo {
    const { role, id, sessionJti, sessionTokenExpUnix, email } = req;
    if (!role || !id || !sessionJti || !sessionTokenExpUnix || !email)
        throw new Error('User information not attached to request');
    return { id, role, sessionJti, sessionTokenExpUnix, email };
}
