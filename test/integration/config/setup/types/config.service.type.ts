import { ConfigService } from 'src/services/config.service';

export type IntegrationConfigService = Omit<ConfigService,
    | 'PORT'
    | 'MAIL_SERVICE_HOST' // replaced by nodemailer-mock
    | 'MAIL_SERVICE_PORT'
    | 'MAIL_SERVICE_USER'
    | 'MAIL_SERVICE_PASS'
    | 'REDIS_URI' // replaced by ioredis-mock    
    | 'WEB_URL'
    | 'REDIS_URI'
>