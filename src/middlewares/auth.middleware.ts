import { NextFunction, Request, RequestHandler, Response } from 'express';
import { statusCodes } from 'src/constants/status-codes.constants';
import { authErrors } from 'src/messages/auth.error.messages';
import { LoggerService } from 'src/services/logger.service';
import { SessionTokenService } from 'src/services/session-token.service';

export class AuthMiddleware {
    constructor(
        private readonly sessionTokenService: SessionTokenService,
        private readonly loggerService: LoggerService,
    ) {}

    middleware(): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            // verify token presence
            const authorizationHeader = req.header('authorization');
            if (!authorizationHeader || !authorizationHeader.startsWith('Bearer ')) {
                this.loggerService.error('No authorization token provided');
                res.status(statusCodes.UNAUTHORIZED).json({ error: authErrors.INVALID_TOKEN });
                return;
            }
            // valid token
            const token = authorizationHeader.split(' ').at(1) || '';
            const userData = await this.sessionTokenService.consume(token);
            req.user = userData;
            next();
        };
    }
}
