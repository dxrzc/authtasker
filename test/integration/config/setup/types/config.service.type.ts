import { ConfigService } from '@root/services';

export type IntegrationConfigService = Omit<ConfigService,
    | 'PORT'
    | 'NODE_ENV'
    | 'MAIL_SERVICE_HOST' // replaced by nodemailer-mock
    | 'MAIL_SERVICE_PORT'
    | 'MAIL_SERVICE_USER'
    | 'MAIL_SERVICE_PASS'
    | 'REDIS_PORT' // replaced by ioredis-mock
    | 'REDIS_HOST'
    | 'REDIS_PASSWORD'
    | 'WEB_URL'
>