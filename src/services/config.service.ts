import * as env from 'env-var';

export class ConfigService {
    public readonly NODE_ENV = env
        .get('NODE_ENV')
        .required()
        .asEnum(['development', 'e2e', 'integration', 'production']);

    public readonly MONGO_URI = env.get('MONGO_URI').required().asString();

    public readonly REDIS_URI = env.get('REDIS_URI').required().asString();

    public readonly PORT = env.get('PORT').required().asPortNumber();

    public readonly BCRYPT_SALT_ROUNDS = env.get('BCRYPT_SALT_ROUNDS').required().asInt();

    public readonly JWT_SESSION_EXP_TIME = env.get('JWT_SESSION_EXP_TIME').required().asString();

    public readonly JWT_PASSWORD_RECOVERY_EXP_TIME = env
        .get('JWT_PASSWORD_RECOVERY_EXP_TIME')
        .required()
        .asString();

    public readonly JWT_EMAIL_VALIDATION_EXP_TIME = env
        .get('JWT_EMAIL_VALIDATION_EXP_TIME')
        .required()
        .asString();

    public readonly JWT_REFRESH_EXP_TIME = env.get('JWT_REFRESH_EXP_TIME').required().asString();

    public readonly JWT_SESSION_PRIVATE_KEY = env
        .get('JWT_SESSION_PRIVATE_KEY')
        .required()
        .asString();

    public readonly JWT_EMAIL_VALIDATION_PRIVATE_KEY = env
        .get('JWT_EMAIL_VALIDATION_PRIVATE_KEY')
        .required()
        .asString();

    public readonly JWT_PASSWORD_RECOVERY_PRIVATE_KEY = env
        .get('JWT_PASSWORD_RECOVERY_PRIVATE_KEY')
        .required()
        .asString();

    public readonly JWT_REFRESH_PRIVATE_KEY = env
        .get('JWT_REFRESH_PRIVATE_KEY')
        .required()
        .asString();

    public readonly MAX_REFRESH_TOKENS_PER_USER = env
        .get('MAX_REFRESH_TOKENS_PER_USER')
        .required()
        .asIntPositive();

    public readonly MAIL_SERVICE_HOST = env.get('MAIL_SERVICE_HOST').required().asString();

    public readonly MAIL_SERVICE_PORT = env.get('MAIL_SERVICE_PORT').required().asPortNumber();

    public readonly MAIL_SERVICE_USER = env.get('MAIL_SERVICE_USER').required().asString();

    public readonly MAIL_SERVICE_PASS = env.get('MAIL_SERVICE_PASS').required().asString();

    public readonly WEB_URL = env.get('WEB_URL').required().asUrlString();

    public readonly HTTP_LOGS = env.get('HTTP_LOGS').asBool();

    public readonly ADMIN_NAME = env.get('ADMIN_NAME').required().asString();

    public readonly ADMIN_EMAIL = env.get('ADMIN_EMAIL').required().asEmailString();

    public readonly ADMIN_PASSWORD = env.get('ADMIN_PASSWORD').required().asString();

    public readonly API_MAX_REQ_PER_MINUTE = env
        .get('API_MAX_REQ_PER_MINUTE')
        .required()
        .asIntPositive();

    public readonly AUTH_MAX_REQ_PER_MINUTE = env
        .get('AUTH_MAX_REQ_PER_MINUTE')
        .required()
        .asIntPositive();

    public readonly USERS_API_CACHE_TTL_SECONDS = env
        .get('USERS_API_CACHE_TTL_SECONDS')
        .required()
        .asIntPositive();

    public readonly TASKS_API_CACHE_TTL_SECONDS = env
        .get('TASKS_API_CACHE_TTL_SECONDS')
        .required()
        .asIntPositive();

    public readonly CACHE_HARD_TTL_SECONDS = env.get('CACHE_HARD_TTL_SECONDS').required().asInt();

    public readonly PAGINATION_CACHE_TTLS_SECONDS = env
        .get('PAGINATION_CACHE_TTLS_SECONDS')
        .required()
        .asIntPositive();
}
