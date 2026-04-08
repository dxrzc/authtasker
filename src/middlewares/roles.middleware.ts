import { NextFunction, Request, RequestHandler, Response } from 'express';
import { statusCodes } from 'src/constants/status-codes.constants';
import { hasSufficientRole } from 'src/functions/roles/has-sufficient-role';
import { authErrors } from 'src/messages/auth.error.messages';
import { LoggerService } from 'src/services/logger.service';
import { UserRole } from 'src/enums/user-role.enum';
import { userInfoInReq } from 'src/functions/express/user-info-in-req';

export class RolesMiddleware {
    constructor(private readonly loggerService: LoggerService) {}

    middleware(minRoleRequired: UserRole): RequestHandler {
        return (req: Request, res: Response, next: NextFunction) => {
            const { id, role } = userInfoInReq(req);
            // check if user role is allowed to access this endpoint
            if (hasSufficientRole(minRoleRequired, role)) {
                this.loggerService.info(`Access granted for ${id} (${role})`);
                next();
            } else {
                this.loggerService.error(`Access denied for ${id} (${role})`);
                res.status(statusCodes.FORBIDDEN).json({ error: authErrors.FORBIDDEN });
            }
        };
    }
}
