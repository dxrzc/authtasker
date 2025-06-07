import rateLimit from "express-rate-limit";
import { ConfigService } from "@root/services";
import { BaseMiddleware } from '@root/common/classes';

export class ApiLimiterMiddleware extends BaseMiddleware {

    constructor(private readonly configService: ConfigService) {
        super();
    }

    protected getHandler() {
        return rateLimit({
            windowMs: 1 * 60 * 1000,
            max: this.configService.API_MAX_REQ_PER_MINUTE,
            message: 'Too many requests, please try again later.',
            standardHeaders: false,
            legacyHeaders: false,
        });
    }
}