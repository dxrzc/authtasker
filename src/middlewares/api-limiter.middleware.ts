// Disabled temporarily
// export class ApiLimiterMiddleware {
//     constructor(
//         private readonly configService: ConfigService,
//         private readonly loggerService: LoggerService,
//     ) {}

//     // eslint-disable-next-line @typescript-eslint/no-unused-vars
//     middleware(type: ApiType) {
//         // let message: string;
//         // switch (type) {
//         //     case ApiType.coreApi: {
//         //         message = commonErrors.TOO_MANY_REQUESTS;
//         //         break;
//         //     }
//         //     case ApiType.authApi: {
//         //         message = authErrors.TOO_MANY_REQUESTS;
//         //         break;
//         //     }
//         // }

//         return (req, res, next) => {
//             next();
//         };

//         // return rateLimit({
//         //     message: () => {
//         //         this.loggerService.error('Too many requests from this IP');
//         //         return { error: message };
//         //     },
//         //     max: this.configService.API_MAX_REQ_PER_MINUTE,
//         //     windowMs: 1 * 60 * 1000,
//         //     standardHeaders: false,
//         //     legacyHeaders: false,
//         //     skip: () => this.configService.NODE_ENV === 'development',
//         // });
//     }
// }
