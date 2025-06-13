import { UserRole } from '@root/types/user/user-roles.type';
import { LoggerService } from '@root/services/logger.service';
import { hasSufficientRole } from '@logic/roles/has-sufficent-role';
import { BaseMiddleware } from '@root/common/base/base-middleware.class';
import { NextFunction, Request, RequestHandler, Response } from "express";
import { SessionTokenService } from '@root/services/session-token.service';
import { statusCodes } from '@root/common/constants/status-codes.constants';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';

export class RolesMiddleware extends BaseMiddleware<[UserRole]> {

    constructor(        
        private readonly sessionTokenService: SessionTokenService,
        private readonly loggerService: LoggerService
    ) {
        super();
    }

    protected getHandler(minRoleRequired: UserRole): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            // verify token presence
            const authorizationHeader = req.header('authorization');
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer')) {
                res.status(statusCodes.UNAUTHORIZED).json({ error: authErrors.INVALID_TOKEN });
                return;
            }

            // valid token
            const token = authorizationHeader.split(' ').at(1) || '';
            const userFromRequestInfo = await this.sessionTokenService.consume(token);
            const { id, role } = userFromRequestInfo;

            // check if user role is allowed to access this endpoint
            if (hasSufficientRole(minRoleRequired, role)) {
                this.loggerService.info(`Access granted for ${id} (${role})`);
                Object.assign(req, userFromRequestInfo);
                next();
            }
            else {
                this.loggerService.error(`Access denied for ${id} (${role})`);
                res.status(statusCodes.FORBIDDEN).json({ error: authErrors.FORBIDDEN });
            }
        }
    }
}