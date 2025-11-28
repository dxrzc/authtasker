import { NextFunction, Request, RequestHandler, Response } from 'express';
import { statusCodes } from 'src/constants/status-codes.constants';
import { hasSufficientRole } from 'src/functions/roles/has-sufficient-role';
import { authErrors } from 'src/messages/auth.error.messages';
import { LoggerService } from 'src/services/logger.service';
import { SessionTokenService } from 'src/services/session-token.service';
import { UserRole } from 'src/enums/user-role.enum';

export class RolesMiddleware {
    constructor(
        private readonly sessionTokenService: SessionTokenService,
        private readonly loggerService: LoggerService,
    ) {}

    middleware(minRoleRequired: UserRole): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            // verify token presence
            const authorizationHeader = req.header('authorization');
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer')) {
                this.loggerService.error('No authorization token provided');
                res.status(statusCodes.UNAUTHORIZED).json({ error: authErrors.INVALID_TOKEN });
                return;
            }

            // valid token
            const token = authorizationHeader.split(' ').at(1) || '';
            const authenticatedUserData = await this.sessionTokenService.consume(token);
            const { id, role } = authenticatedUserData;

            // check if user role is allowed to access this endpoint
            if (hasSufficientRole(minRoleRequired, role)) {
                this.loggerService.info(`Access granted for ${id} (${role})`);
                Object.assign(req, authenticatedUserData);
                next();
            } else {
                this.loggerService.error(`Access denied for ${id} (${role})`);
                res.status(statusCodes.FORBIDDEN).json({ error: authErrors.FORBIDDEN });
            }
        };
    }
}
