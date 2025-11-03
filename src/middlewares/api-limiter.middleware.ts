import rateLimit from 'express-rate-limit';
import { ApiType } from 'src/enums/api-type.enum';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { BaseMiddleware } from 'src/common/base/base-middleware.class';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { commonErrors } from 'src/common/errors/messages/common.error.messages';

export class ApiLimiterMiddleware extends BaseMiddleware<[ApiType]> {
    constructor(
        private readonly configService: ConfigService,
        private readonly loggerService: LoggerService,
    ) {
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
            message: () => {
                this.loggerService.error('Too many requests from this IP');
                return { error: message };
            },
            max: this.configService.API_MAX_REQ_PER_MINUTE,
            windowMs: 1 * 60 * 1000,
            standardHeaders: false,
            legacyHeaders: false,
            skip: (req, res) => this.configService.NODE_ENV === 'development',
        });
    }
}
