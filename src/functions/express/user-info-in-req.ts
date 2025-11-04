import { UserFromRequest } from 'src/interfaces/user/user-from-request.interface';
import { Request } from 'express';

export function userInfoInReq(req: Request & Partial<UserFromRequest>): UserFromRequest {
    const { role, id, sessionJti, sessionTokenExpUnix } = req;
    if (!role || !id || !sessionJti || !sessionTokenExpUnix)
        throw new Error('User information not attached to request');
    return { id, role, sessionJti, sessionTokenExpUnix };
}
