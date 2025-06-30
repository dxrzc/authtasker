import rateLimit from "express-rate-limit";
import { ApiType } from '@root/enums/api-type.enum';
import { ConfigService } from '@root/services/config.service';
import { BaseMiddleware } from '@root/common/base/base-middleware.class';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { commonErrors } from '@root/common/errors/messages/common.error.messages';

export class ApiLimiterMiddleware extends BaseMiddleware<[ApiType]> {

    constructor(private readonly configService: ConfigService) {
        super();
    }

    protected getHandler(type: ApiType) {
        let message: string;

        switch (type) {
            case ApiType.coreApi: {
                message = commonErrors.TOO_MANY_REQUESTS;
                break;
            }
            case ApiType.authApi: {
                message = authErrors.TOO_MANY_REQUESTS;
                break;
            }
        }
        return rateLimit({
            message,
            max: this.configService.API_MAX_REQ_PER_MINUTE,
            windowMs: 1 * 60 * 1000,
            standardHeaders: false,
            legacyHeaders: false,
        });
    }
}