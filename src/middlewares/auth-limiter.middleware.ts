import { RequestHandler } from 'express';
import rateLimit from "express-rate-limit";
import { ConfigService } from "@root/services";
import { BaseMiddleware } from '@root/common/base';

export class AuthLimiterMiddleware extends BaseMiddleware {    

    constructor(private readonly configService: ConfigService) {
        super();
    }

    protected getHandler(): RequestHandler {
        return rateLimit({
            windowMs: 1 * 60 * 1000,
            max: this.configService.AUTH_MAX_REQ_PER_MINUTE,
            message: 'Too many requests, please try again later.',
            standardHeaders: false,
            legacyHeaders: false
        })
    }
}