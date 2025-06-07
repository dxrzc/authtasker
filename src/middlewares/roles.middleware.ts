import { Model } from "mongoose";
import { NextFunction, Request, RequestHandler, Response } from "express";
import { IUser } from "@root/interfaces";
import { JwtBlackListService, JwtService, LoggerService } from "@root/services";
import { UserRole } from "@root/types/user";
import { processSessionToken } from "@logic/token";
import { hasSufficientRole } from "@logic/roles";
import { statusCodes } from '@root/common/constants';
import { BaseMiddleware } from '@root/common/base';
import { errorMessages } from '@root/common/errors/messages';

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
                res.status(statusCodes.UNAUTHORIZED).json({ error: errorMessages.INVALID_TOKEN });
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
                    res.status(statusCodes.FORBIDDEN).json({ error: errorMessages.FORBIDDEN });
                }
            }
        }
    }
}