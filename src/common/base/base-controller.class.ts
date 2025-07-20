import { Request, Response } from 'express';
import { BaseHttpComponent } from './base-http-component.class';
import { UserFromRequest } from '@root/interfaces/user/user-from-request.interface';

export abstract class BaseController extends BaseHttpComponent {
    // get the user request info, the roles middleware is in charge to collect this info
    protected getUserRequestInfo(req: Request & Partial<UserFromRequest>, res: Response): UserFromRequest | never {
        const role = req.role;
        const id = req.id;
        const sessionJti = req.sessionJti;
        const sessionTokenExpUnix = req.sessionTokenExpUnix;
        if (!role || !id || !sessionJti || !sessionTokenExpUnix)
            throw new Error('role, id, jti and tokenExp are expected');
        return {
            id,
            role,
            sessionJti,
            sessionTokenExpUnix
        };
    }
}
