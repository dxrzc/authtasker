import { Model, Types } from 'mongoose';
import { Apis } from 'src/enums/apis.enum';
import { CacheService } from './cache.service';
import { EmailService } from 'src/services/email.service';
import { IUser } from 'src/interfaces/user/user.interface';
import { RefreshTokenService } from './refresh-token.service';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { SessionTokenService } from './session-token.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { HashingService } from 'src/services/hashing.service';
import { paginationRules } from 'src/functions/pagination/pagination-rules';
import { UserResponse } from 'src/types/user/user-response.type';
import { UserDocument } from 'src/types/user/user-document.type';
import { HttpError } from 'src/errors/http-error.class';
import { authErrors } from 'src/messages/auth.error.messages';
import { ICacheOptions } from 'src/interfaces/cache/cache-options.interface';
import { EmailValidationTokenService } from './email-validation-token.service';
import { UserFromRequest } from 'src/interfaces/user/user-from-request.interface';
import { handleDuplicatedKeyInDb } from 'src/functions/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from 'src/functions/roles/modification-access-control';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';
import { PaginationCacheService } from './pagination-cache.service';
import { ForgotPasswordValidator } from 'src/validators/models/user/forgot-password.validator';
import { PasswordRecoveryTokenService } from './password-recovery-token.service';

export class UserService {
    constructor(
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly tasksModel: Model<ITasks>,
        private readonly hashingService: HashingService,
        private readonly loggerService: LoggerService,
        private readonly emailService: EmailService,
        private readonly sessionTokenService: SessionTokenService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly emailValidationTokenService: EmailValidationTokenService,
        private readonly cacheService: CacheService<UserResponse>,
        private readonly paginationCache: PaginationCacheService,
        private readonly passwordRecoveryTokenService: PasswordRecoveryTokenService,
    ) {}

    private async findUserInDb(id: string): Promise<UserDocument> {
        const userInDb = await this.userModel.findById(id).exec();
        if (!userInDb) {
            this.loggerService.error(`User ${id} not found`);
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        return userInDb;
    }

    private handleRefreshTokenNotInBody(): never {
        this.loggerService.error('Refresh token was not sent');
        throw HttpError.badRequest(authErrors.REFRESH_TOKEN_NOT_PROVIDED_IN_BODY);
    }

    private async authorizeUserModificationOrThrow(
        requestUserInfo: UserFromRequest,
        targetUserId: string,
    ): Promise<UserDocument> {
        const targetUserDocument = (await this.findOne(targetUserId, {
            noStore: true,
        })) as UserDocument;
        const isCurrentUserAuthorized = modificationAccessControl(requestUserInfo, {
            id: targetUserId,
            role: targetUserDocument.role,
        });
        if (!isCurrentUserAuthorized) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        return targetUserDocument;
    }

    private async sendEmailValidationLink(email: string): Promise<void> {
        const token = this.emailValidationTokenService.generate(email);
        // web url is appended with a default "/" when read
        const link = `${this.configService.WEB_URL}api/users/confirmEmailValidation/${token}`;
        await this.emailService.sendMail({
            to: email,
            subject: 'Email validation',
            html: `
            <h1> Validate your email </h1>
            <p> Click below to validate your email </p>
            <a href= "${link}"> Validate your email ${email} </a>`,
        });
        this.loggerService.info(`Email validation sent to ${email}`);
    }

    private async setNewPropertiesInDocument(
        userDocument: UserDocument,
        propertiesUpdated: UpdateUserValidator,
    ): Promise<void> {
        // updating email
        if (propertiesUpdated.email) {
            if (userDocument.role !== 'admin') {
                userDocument.emailValidated = false;
                userDocument.role = 'readonly';
            }
            userDocument.email = propertiesUpdated.email;
        }
        // updating password
        if (propertiesUpdated.password) {
            userDocument.password = await this.hashingService.hash(propertiesUpdated.password);
        }
        // updating name
        if (propertiesUpdated.name) {
            userDocument.name = propertiesUpdated.name;
        }
    }

    private async passwordsMatchOrThrow(
        hashedPassword: string,
        incomingPassword: string,
    ): Promise<void> {
        // password hashing
        const passwordOk = await this.hashingService.compare(incomingPassword, hashedPassword);
        if (!passwordOk) {
            this.loggerService.error('Password does not match');
            throw HttpError.badRequest(authErrors.INVALID_CREDENTIALS);
        }
    }

    async requestEmailValidation(id: string): Promise<void> {
        const user = await this.userModel.findById(id).exec();
        if (!user) {
            this.loggerService.error(`User with id ${id} not found`);
            throw HttpError.badRequest(usersApiErrors.USER_NOT_FOUND);
        }
        // email cannot be validated twice
        if (user.emailValidated === true) {
            this.loggerService.error(`Email ${user.email} is already validated`);
            throw HttpError.badRequest(usersApiErrors.USER_EMAIL_ALREADY_VALIDATED);
        }
        await this.sendEmailValidationLink(user.email);
    }

    async confirmEmailValidation(token: string): Promise<void> {
        const emailInToken = await this.emailValidationTokenService.consume(token);
        // check user existence
        const user = await this.userModel.findOne({ email: emailInToken }).exec();
        if (!user) {
            this.loggerService.error(`User ${emailInToken} not found`);
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        // update
        user.emailValidated = true;
        user.role = 'editor';
        await user.save();
        this.loggerService.info(`User ${user.id} email validated`);
    }

    async create(user: CreateUserValidator) {
        try {
            // password hashing
            const passwordHash = await this.hashingService.hash(user.password);
            user.password = passwordHash;
            // creation in db
            const created = await this.userModel.create(user);
            const userId = created.id;
            this.loggerService.info(`User ${userId} created`);
            // tokens
            const sessionToken = this.sessionTokenService.generate(userId);
            const refreshToken = await this.refreshTokenService.generate(userId);
            return {
                user: created,
                sessionToken,
                refreshToken,
            };
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.users, error, this.loggerService);
            throw error;
        }
    }

    async login(userToLogin: LoginUserValidator) {
        // user existence
        const userDb = await this.userModel.findOne({ email: userToLogin.email }).exec();
        if (!userDb) {
            this.loggerService.error(`User ${userToLogin.email} not found`);
            throw HttpError.badRequest(authErrors.INVALID_CREDENTIALS);
        }
        // password comparison
        await this.passwordsMatchOrThrow(userDb.password, userToLogin.password);
        // refresh token per user limit
        const userRefreshTokens = await this.refreshTokenService.countUserTokens(userDb.id);
        if (userRefreshTokens === this.configService.MAX_REFRESH_TOKENS_PER_USER) {
            this.loggerService.error('User has reached the maximum of active refresh tokens');
            throw HttpError.forbidden(authErrors.REFRESH_TOKEN_LIMIT_EXCEEDED);
        }
        // tokens
        const sessionToken = this.sessionTokenService.generate(userDb.id);
        const refreshToken = await this.refreshTokenService.generate(userDb.id);
        this.loggerService.info(`User ${userDb.id} logged in`);
        return {
            user: userDb,
            sessionToken,
            refreshToken,
        };
    }

    async logout(requestUserInfo: UserFromRequest, refreshToken?: string): Promise<void> {
        // refresh not provided
        if (!refreshToken) this.handleRefreshTokenNotInBody();
        // provided refresh token is valid
        const { jti: refreshJti } = await this.refreshTokenService.validateOrThrow(refreshToken);
        // disable session and refresh tokens
        await Promise.all([
            this.sessionTokenService.blacklist(
                requestUserInfo.sessionJti,
                requestUserInfo.sessionTokenExpUnix,
            ),
            this.refreshTokenService.revokeToken(requestUserInfo.id, refreshJti),
        ]);
        this.loggerService.info(`User ${requestUserInfo.id} logged out`);
    }

    async logoutFromAll(userCredentials: LoginUserValidator) {
        const userData = await this.userModel.findOne({ email: userCredentials.email }).exec();
        if (!userData) {
            this.loggerService.error(`User ${userCredentials.email} not found`);
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        await this.passwordsMatchOrThrow(userData.password, userCredentials.password);
        // revoke all session tokens
        await this.refreshTokenService.revokeAll(userData.id);
        this.loggerService.info(`All refresh tokens of user ${userData.id} have been revoked`);
    }

    async refresh(refreshToken?: string) {
        // refresh not provided
        if (!refreshToken) this.handleRefreshTokenNotInBody();
        // provided refresh token is valid
        const { userId } = await this.refreshTokenService.validateOrThrow(refreshToken);
        // generate new tokens
        const newRefreshToken = await this.refreshTokenService.rotate(refreshToken);
        const newSessionToken = this.sessionTokenService.generate(userId);
        return {
            refreshToken: newRefreshToken,
            sessionToken: newSessionToken,
        };
    }

    async findOne(id: string, options: ICacheOptions): Promise<UserDocument | UserResponse> {
        // validate id
        const validMongoId = Types.ObjectId.isValid(id);
        if (!validMongoId) {
            this.loggerService.error(`Invalid mongo id`);
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(`Bypassing cache for user ${id}`);
            return await this.findUserInDb(id);
        }
        // check if user is cached
        const userInCache = await this.cacheService.get(id);
        if (userInCache) return userInCache;
        // user is not in cache
        const userFound = await this.findUserInDb(id);
        await this.cacheService.cache(userFound);
        return userFound;
    }

    async findAll(limit: number, page: number, options: ICacheOptions): Promise<UserDocument[]> {
        // validate limit and page
        const totalDocuments = await this.userModel.countDocuments().exec();
        if (totalDocuments === 0) return [];
        const offset = paginationRules(limit, page, totalDocuments);
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(`Bypassing cache for users page=${page} limit=${limit}`);
            return await this.userModel
                .find()
                .skip(offset)
                .limit(limit)
                .sort({ createdAt: 1 })
                .exec();
        }
        // check if combination of limit and page is cached
        const chunk = await this.paginationCache.get<UserDocument[]>(Apis.users, page, limit);
        if (chunk) return chunk;
        // data is not cached
        const data = await this.userModel
            .find()
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1 })
            .exec();
        // cache pagination obtained
        await this.paginationCache.cache(Apis.users, page, limit, data);
        return data;
    }

    async deleteOne(requestUserInfo: UserFromRequest, targetUserId: string): Promise<void> {
        await this.authorizeUserModificationOrThrow(requestUserInfo, targetUserId);
        await Promise.all([
            this.userModel.deleteOne({ _id: targetUserId }),
            this.refreshTokenService.revokeAll(targetUserId),
        ]);
        this.loggerService.info(`User ${targetUserId} deleted`);
        // remove all tasks associated
        const tasksRemoved = await this.tasksModel.deleteMany({ user: targetUserId });
        this.loggerService.info(`${tasksRemoved.deletedCount} tasks associated to user removed`);
    }

    async updateOne(
        requestUserInfo: UserFromRequest,
        targetUserId: string,
        propertiesUpdated: UpdateUserValidator,
    ): Promise<UserDocument> {
        const userDocument = await this.authorizeUserModificationOrThrow(
            requestUserInfo,
            targetUserId,
        );
        await this.setNewPropertiesInDocument(userDocument, propertiesUpdated);
        // revoke all refresh tokens and blacklist session token
        if (propertiesUpdated.email || propertiesUpdated.password) {
            // TODO: use promise.all
            await this.refreshTokenService.revokeAll(targetUserId);
            await this.sessionTokenService.blacklist(
                requestUserInfo.sessionJti,
                requestUserInfo.sessionTokenExpUnix,
            );
            this.loggerService.info(
                `All refresh tokens of user ${targetUserId} were revoked due to email/password update`,
            );
        }
        try {
            await userDocument.save();
            this.loggerService.info(`User ${targetUserId} updated`);
            return userDocument;
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.users, error, this.loggerService);
            throw error;
        }
    }

    async resetPassword(newPassword: string, token?: string): Promise<void> {
        if (!token) {
            this.loggerService.error(`Recovery password token not provided`);
            throw HttpError.badRequest(authErrors.INVALID_TOKEN);
        }
        const emailInToken = await this.passwordRecoveryTokenService.consume(token);
        const user = await this.userModel.findOne({ email: emailInToken }).exec();
        if (!user) {
            this.loggerService.error(`User ${emailInToken} not found`);
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        user.password = await this.hashingService.hash(newPassword);
        await user.save();
        this.loggerService.info(`User ${user.id} password updated`);
        // logout all
        await this.refreshTokenService.revokeAll(user.id);
        this.loggerService.info(
            `All refresh tokens of user ${user.id} have been revoked due to password reset`,
        );
    }

    private async sendForgotPasswordLink(email: string): Promise<void> {
        const token = this.passwordRecoveryTokenService.generate(email);
        const link = `${this.configService.WEB_URL}api/users/reset-password?token=${token}`;
        await this.emailService.sendMail({
            to: email,
            subject: 'Password recovery',
            html: `
            <h1> Password Recovery </h1>
            <p> Click below to recover your password </p>
            <a href= "${link}"> Recover your password ${email} </a>`,
        });
        this.loggerService.info(`Password recovery email sent to ${email}`);
    }

    async requestPasswordRecovery(input: ForgotPasswordValidator): Promise<void> {
        let userEmail: string;

        if (input.username) {
            const userInDb = await this.userModel.findOne({ name: input.username }).exec();
            if (!userInDb) {
                this.loggerService.info(
                    `User with username "${input.username}" not found, skipping password recovery`,
                );
                return;
            }
            userEmail = userInDb.email;
        } else {
            const userInDb = await this.userModel.findOne({ email: input.email }).exec();
            if (!userInDb) {
                this.loggerService.info(
                    `User with email "${input.email}" not found, skipping password recovery`,
                );
                return;
            }
            userEmail = input.email as string;
        }
        await this.sendForgotPasswordLink(userEmail);
    }
}
