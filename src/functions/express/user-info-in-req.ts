import { UserSessionInfo } from 'src/interfaces/user/user-session-info.interface';
import { Request } from 'express';

export function userInfoInReq(req: Request): UserSessionInfo {
    if (!req.user) throw new Error('User information not in request');
    const { role, id, sessionJti, sessionTokenExpUnix, email } = req.user;
    if (!role || !id || !sessionJti || !sessionTokenExpUnix || !email)
        throw new Error('User information in request is incomplete');
    return { id, role, sessionJti, sessionTokenExpUnix, email };
}
