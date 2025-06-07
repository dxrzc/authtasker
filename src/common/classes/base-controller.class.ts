import { Request, Response } from 'express';
import { UserFromRequest } from '@root/interfaces';
import { BaseHttpComponent } from './base-http-component';

export abstract class BaseController extends BaseHttpComponent {
    // get the user request info, the roles middleware is in charge to collect this info
    protected getUseRequestInfo(req: Request, res: Response): UserFromRequest | undefined {
        const role = (req as any).userRole;
        const id = (req as any).userId;
        const jti = (req as any).jti;
        const tokenExp = (req as any).tokenExp;
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