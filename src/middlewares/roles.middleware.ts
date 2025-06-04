import { NextFunction, Request, Response } from "express";
import { Model } from "mongoose";
import { FORBIDDEN_MESSAGE } from "@root/rules/errors/messages/error.messages";
import { HTTP_STATUS_CODE } from "@root/rules/constants";
import { IUser } from "@root/interfaces";
import { JwtBlackListService, JwtService, LoggerService } from "@root/services";
import { UserRole } from "@root/types/user";
import { processSessionToken } from "@logic/token";
import { hasSufficientRole } from "@logic/roles";

export const rolesMiddlewareFactory = (
    minRoleRequired: UserRole,
    userModel: Model<IUser>,
    loggerService: LoggerService,
    jwtService: JwtService,
    jwtBlacklistService: JwtBlackListService,
) => {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        try {
            // verifies token presence, not in blacklist, signed, etc...
            const tokenProcessed = await processSessionToken(req, userModel, jwtService, jwtBlacklistService);
            // token is not valid
            if ('error' in tokenProcessed) {
                res.status(HTTP_STATUS_CODE.UNAUTHORIZED).json({ error: 'Invalid bearer token' });
                loggerService.error(tokenProcessed.error);
                return;
            } else {
                const { id, role } = tokenProcessed;
                // check if user role is allowed to access this endpoint
                if (hasSufficientRole(minRoleRequired, role)) {
                    loggerService.info(`Access granted for ${id} (${role})`);
                    Object.assign(req, tokenProcessed);
                    next();
                }
                else {
                    loggerService.error(`Access denied for ${id} (${role})`);
                    res.status(HTTP_STATUS_CODE.FORBIDDEN).json({ error: FORBIDDEN_MESSAGE });
                }
            }
        } catch (error) {
            next(error);
        }
    };
}