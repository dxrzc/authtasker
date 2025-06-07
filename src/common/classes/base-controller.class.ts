import { Request, Response } from 'express';
import { UserFromRequest } from '@root/interfaces';
import { BaseHttpComponent } from './base-http-component';

export abstract class BaseController extends BaseHttpComponent {
    // get the user request info, the roles middleware is in charge to collect this info
    protected getUserRequestInfo(req: Request & Partial<UserFromRequest>, res: Response): UserFromRequest | undefined {
        const role = req.role;
        const id = req.id;
        const jti = req.jti;
        const tokenExp = req.tokenExp;
        if (!role || !id || !jti || !tokenExp)
            throw new Error('role, id, jti and tokenExp are expected');
        return {
            id,
            role,
            jti,
            tokenExp
        };
    }
}
