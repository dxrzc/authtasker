import { Model } from "mongoose";
import { JwtService } from '@root/services/jwt.service';
import { UserRole } from '@root/types/user/user-roles.type';
import { IUser } from '@root/interfaces/user/user.interface';
import { LoggerService } from '@root/services/logger.service';
import { hasSufficientRole } from '@logic/roles/has-sufficent-role';
import { processSessionToken } from '@logic/token/process-session-token';
import { BaseMiddleware } from '@root/common/base/base-middleware.class';
import { NextFunction, Request, RequestHandler, Response } from "express";
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';
import { statusCodes } from '@root/common/constants/status-codes.constants';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';

export class RolesMiddleware extends BaseMiddleware<[UserRole]> {

    constructor(
        private readonly userModel: Model<IUser>,
        private readonly loggerService: LoggerService,
        private readonly jwtService: JwtService,
        private readonly jwtBlacklistService: JwtBlackListService,
    ) {
        super();
    }

    protected getHandler(minRoleRequired: UserRole): RequestHandler {
        return async (req: Request, res: Response, next: NextFunction) => {
            // verifies token presence, not in blacklist, signed, etc...
            const tokenProcessed = await processSessionToken(req, this.userModel, this.jwtService, this.jwtBlacklistService);
            // token is not valid
            if ('error' in tokenProcessed) {
                res.status(statusCodes.UNAUTHORIZED).json({ error: authErrors.INVALID_TOKEN });
                this.loggerService.error(tokenProcessed.error);
                return;
            } else {
                const { id, role } = tokenProcessed;
                // check if user role is allowed to access this endpoint
                if (hasSufficientRole(minRoleRequired, role)) {
                    this.loggerService.info(`Access granted for ${id} (${role})`);
                    Object.assign(req, tokenProcessed);
                    next();
                }
                else {
                    this.loggerService.error(`Access denied for ${id} (${role})`);
                    res.status(statusCodes.FORBIDDEN).json({ error: authErrors.FORBIDDEN });
                }
            }
        }
    }
}