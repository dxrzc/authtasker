import * as env from "env-var";

export class ConfigService {
    public readonly NODE_ENV: string;
    public readonly MONGO_URI: string;
    public readonly REDIS_URI: string;
    public readonly PORT: number;
    public readonly BCRYPT_SALT_ROUNDS: number;
    public readonly JWT_SESSION_EXP_TIME: string;
    public readonly JWT_EMAIL_VALIDATION_EXP_TIME: string;
    public readonly JWT_REFRESH_EXP_TIME: string;
    public readonly JWT_PRIVATE_KEY: string;
    public readonly JWT_REFRESH_PRIVATE_KEY: string;
    public readonly MAX_REFRESH_TOKENS_PER_USER: number;
    public readonly MAIL_SERVICE_HOST: string;
    public readonly MAIL_SERVICE_PORT: number;
    public readonly MAIL_SERVICE_USER: string;
    public readonly MAIL_SERVICE_PASS: string;
    public readonly WEB_URL: string;
    public readonly HTTP_LOGS: boolean;
    public readonly ADMIN_NAME: string;
    public readonly ADMIN_EMAIL: string;
    public readonly ADMIN_PASSWORD: string;
    public readonly API_MAX_REQ_PER_MINUTE: number;
    public readonly AUTH_MAX_REQ_PER_MINUTE: number;
    public readonly USERS_API_CACHE_TTL_SECONDS: number;
    public readonly TASKS_API_CACHE_TTL_SECONDS: number;
    public readonly CACHE_HARD_TTL_SECONDS: number;
    public readonly PAGINATION_CACHE_TTLS_SECONDS: number;

    constructor() {
        // environment
        this.NODE_ENV = env.get('NODE_ENV').required()
            .asEnum(['development', 'e2e', 'integration', 'production'])

        // server config
        this.PORT = env.get('PORT').default(3000).asPortNumber();
        this.WEB_URL = env.get('WEB_URL').required().asUrlString();
        this.HTTP_LOGS = env.get('HTTP_LOGS').default("true").asBool();
        this.BCRYPT_SALT_ROUNDS = env.get('BCRYPT_SALT_ROUNDS').default(10).asInt();
        this.API_MAX_REQ_PER_MINUTE = env.get('API_MAX_REQ_PER_MINUTE').required().asIntPositive();
        this.AUTH_MAX_REQ_PER_MINUTE = env.get('AUTH_MAX_REQ_PER_MINUTE').required().asIntPositive();

        // jwts
        this.JWT_PRIVATE_KEY = env.get('JWT_PRIVATE_KEY').required().asString();
        this.JWT_REFRESH_EXP_TIME = env.get('JWT_REFRESH_EXP_TIME').required().asString();
        this.JWT_SESSION_EXP_TIME = env.get('JWT_SESSION_EXP_TIME').required().asString();
        this.JWT_REFRESH_PRIVATE_KEY = env.get('JWT_REFRESH_PRIVATE_KEY').required().asString();
        this.JWT_EMAIL_VALIDATION_EXP_TIME = env.get('JWT_EMAIL_VALIDATION_EXP_TIME').required().asString();
        this.MAX_REFRESH_TOKENS_PER_USER = env.get('MAX_REFRESH_TOKENS_PER_USER').required().asIntPositive();

        // databases
        this.MONGO_URI = env.get('MONGO_URI').required().asUrlString();
        this.REDIS_URI = env.get('REDIS_URI').required().asUrlString();

        // email-service        
        this.MAIL_SERVICE_HOST = env.get('MAIL_SERVICE_HOST').required().asString();
        this.MAIL_SERVICE_USER = env.get('MAIL_SERVICE_USER').required().asString();
        this.MAIL_SERVICE_PASS = env.get('MAIL_SERVICE_PASS').required().asString();
        this.MAIL_SERVICE_PORT = env.get('MAIL_SERVICE_PORT').required().asPortNumber();


        // server admin
        this.ADMIN_NAME = env.get('ADMIN_NAME').required().asString();
        this.ADMIN_EMAIL = env.get('ADMIN_EMAIL').required().asEmailString();
        this.ADMIN_PASSWORD = env.get('ADMIN_PASSWORD').required().asString();

        // cache
        this.CACHE_HARD_TTL_SECONDS = env.get('CACHE_HARD_TTL_SECONDS').required().asInt();
        this.TASKS_API_CACHE_TTL_SECONDS = env.get('TASKS_API_CACHE_TTL_SECONDS').required().asIntPositive();
        this.USERS_API_CACHE_TTL_SECONDS = env.get('USERS_API_CACHE_TTL_SECONDS').required().asIntPositive();
        this.PAGINATION_CACHE_TTLS_SECONDS = env.get('PAGINATION_CACHE_TTLS_SECONDS').required().asIntPositive();
    }
}
