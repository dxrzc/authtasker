import * as env from 'env-var';
import path from 'path';
import fs from 'fs';

export class ConfigService {
    public readonly NODE_ENV = env
        .get('NODE_ENV')
        .required()
        .asEnum(['development', 'e2e', 'integration', 'production']);

    // secrets
    public readonly JWT_EMAIL_VALIDATION_PRIVATE_KEY: string;
    public readonly JWT_PASSWORD_RECOVERY_PRIVATE_KEY: string;
    public readonly JWT_SESSION_PRIVATE_KEY: string;
    public readonly JWT_REFRESH_PRIVATE_KEY: string;
    public readonly BCRYPT_SALT_ROUNDS: number;
    public readonly PASSWORD_PEPPER: string;
    public readonly MONGO_URI: string;
    public readonly REDIS_URI: string;

    /**
     * @returns A mapping of secret names to their content read from the file system
     */
    private loadSecretObject() {
        const secretsPath = '/var/run/secrets/app';
        const entries = fs.readdirSync(secretsPath, { withFileTypes: true });
        const files = entries.filter((e) => e.isFile()).map((e) => e.name);
        const result = {};
        files.map((name) => {
            const content = fs.readFileSync(path.join(secretsPath, name), 'utf8');
            result[name] = content;
        });
        return result;
    }

    constructor() {
        // Read from file secrets in production, from env otherwise
        let secretsMapper: typeof env;
        if (this.NODE_ENV === 'production')
            secretsMapper = env.from(this.loadSecretObject()) as unknown as typeof env;
        else secretsMapper = env;

        // secrets
        this.MONGO_URI = secretsMapper.get('MONGO_URI').required().asString();
        this.REDIS_URI = secretsMapper.get('REDIS_URI').required().asString();
        this.BCRYPT_SALT_ROUNDS = secretsMapper.get('BCRYPT_SALT_ROUNDS').required().asInt();
        this.PASSWORD_PEPPER = secretsMapper.get('PASSWORD_PEPPER').required().asString();
        this.JWT_SESSION_PRIVATE_KEY = secretsMapper
            .get('JWT_SESSION_PRIVATE_KEY')
            .required()
            .asString();
        this.JWT_EMAIL_VALIDATION_PRIVATE_KEY = secretsMapper
            .get('JWT_EMAIL_VALIDATION_PRIVATE_KEY')
            .required()
            .asString();
        this.JWT_PASSWORD_RECOVERY_PRIVATE_KEY = secretsMapper
            .get('JWT_PASSWORD_RECOVERY_PRIVATE_KEY')
            .required()
            .asString();
        this.JWT_REFRESH_PRIVATE_KEY = secretsMapper
            .get('JWT_REFRESH_PRIVATE_KEY')
            .required()
            .asString();
        this.MAIL_SERVICE_PASS = secretsMapper.get('MAIL_SERVICE_PASS').required().asString();
        this.ADMIN_PASSWORD = secretsMapper.get('ADMIN_PASSWORD').required().asString();
    }

    public readonly PORT = env.get('PORT').required().asPortNumber();

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
    public readonly MAX_REFRESH_TOKENS_PER_USER = env
        .get('MAX_REFRESH_TOKENS_PER_USER')
        .required()
        .asIntPositive();

    public readonly MAIL_SERVICE_HOST = env.get('MAIL_SERVICE_HOST').required().asString();

    public readonly MAIL_SERVICE_PORT = env.get('MAIL_SERVICE_PORT').required().asPortNumber();

    public readonly MAIL_SERVICE_USER = env.get('MAIL_SERVICE_USER').required().asString();

    public readonly MAIL_SERVICE_PASS: string;

    // web url is appended with a default "/" when read
    public readonly WEB_URL = env.get('WEB_URL').required().asUrlString();

    public readonly HTTP_LOGS = env.get('HTTP_LOGS').asBool();

    public readonly ADMIN_NAME = env.get('ADMIN_NAME').required().asString();

    public readonly ADMIN_EMAIL = env.get('ADMIN_EMAIL').required().asEmailString();

    public readonly ADMIN_PASSWORD: string;

    public readonly USERS_API_CACHE_TTL_SECONDS = env
        .get('USERS_API_CACHE_TTL_SECONDS')
        .required()
        .asIntPositive();

    public readonly TASKS_API_CACHE_TTL_SECONDS = env
        .get('TASKS_API_CACHE_TTL_SECONDS')
        .required()
        .asIntPositive();

    public readonly CACHE_HARD_TTL_SECONDS = env.get('CACHE_HARD_TTL_SECONDS').required().asInt();

    get isProduction(): boolean {
        return this.NODE_ENV === 'production';
    }

    get isDevelopment(): boolean {
        return this.NODE_ENV === 'development';
    }
}
