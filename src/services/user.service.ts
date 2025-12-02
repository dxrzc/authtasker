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
import { UserResponse } from 'src/types/user/user-response.type';
import { UserDocument } from 'src/types/user/user-document.type';
import { HttpError } from 'src/errors/http-error.class';
import { authErrors } from 'src/messages/auth.error.messages';
import { EmailValidationTokenService } from './email-validation-token.service';
import { UserSessionInfo } from 'src/interfaces/user/user-session-info.interface';
import { handleDuplicatedKeyInDb } from 'src/functions/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from 'src/functions/roles/modification-access-control';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';
import { PasswordRecoveryTokenService } from './password-recovery-token.service';
import { UserRole } from 'src/enums/user-role.enum';
import { validateYourEmailTemplate } from 'src/templates/validate-your-email.template';
import { IFindOptions } from 'src/interfaces/others/find-options.interface';
import { allSettledAndThrow } from 'src/functions/js/all-settled-and-throw';
import { resetYourPasswordTemplate } from 'src/templates/reset-your-password.template';
import { calculatePagination } from 'src/functions/pagination/calculate-pagination';
import { IPagination } from 'src/interfaces/pagination/pagination.interface';

export class UserService {
    constructor(
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly tasksModel: Model<ITasks>,
        private readonly hashingService: HashingService,
        public readonly loggerService: LoggerService,
        private readonly emailService: EmailService,
        private readonly sessionTokenService: SessionTokenService,
        private readonly refreshTokenService: RefreshTokenService,
        private readonly emailValidationTokenService: EmailValidationTokenService,
        private readonly cacheService: CacheService<UserDocument>,
        private readonly passwordRecoveryTokenService: PasswordRecoveryTokenService,
    ) {}

    private isValidMongoIdOrThrow(id: string): void {
        const validMongoId = Types.ObjectId.isValid(id);
        if (!validMongoId) {
            this.loggerService.error(`Invalid mongo id`);
            throw HttpError.notFound(usersApiErrors.NOT_FOUND);
        }
    }

    private async findOneByIdOrThrow(id: string): Promise<UserDocument> {
        this.isValidMongoIdOrThrow(id);
        const userInDb = await this.userModel.findById(id).exec();
        if (!userInDb) {
            this.loggerService.error(`User ${id} not found`);
            throw HttpError.notFound(usersApiErrors.NOT_FOUND);
        }
        return userInDb;
    }

    private async findOneByIdOrThrowCacheEnabled(id: string): Promise<UserDocument> {
        this.isValidMongoIdOrThrow(id);
        // check user in cache
        const userInCache = await this.cacheService.get(id);
        if (userInCache) {
            this.loggerService.info(`User ${id} found in cache`);
            return userInCache;
        }
        // user is not in cache
        const userFound = await this.findOneByIdOrThrow(id);
        await this.cacheService.cache(userFound);
        this.loggerService.info(`User ${id} cached`);
        return userFound;
    }

    // check whether current user can modify target user
    private async verifyUserModificationRights(
        sessionUser: UserSessionInfo,
        targetUserId: string,
    ): Promise<UserDocument> {
        const targetUser = await this.findOneByIdOrThrow(targetUserId);
        const isAuthorized = modificationAccessControl(sessionUser, {
            id: targetUserId,
            role: targetUser.role,
        });
        if (!isAuthorized) {
            this.loggerService.error(
                `User ${sessionUser.id} is not authorized to modify user ${targetUserId}`,
            );
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        return targetUser;
    }

    private async sendEmailValidationLink(email: string): Promise<void> {
        const token = this.emailValidationTokenService.generate(email);
        const link = `${this.configService.WEB_URL}api/users/confirm-email-validation?token=${token}`;
        await this.emailService.sendMail({
            html: validateYourEmailTemplate(link),
            subject: 'Email validation',
            to: email,
        });
        this.loggerService.info(`Email validation sent to ${email}`);
    }

    private async updateUserDocumentProperties(
        userDocument: UserDocument,
        propertiesUpdated: UpdateUserValidator,
    ): Promise<void> {
        if (propertiesUpdated.email) {
            this.loggerService.info(`User ${userDocument.id} email updated`);
            if (userDocument.role !== UserRole.ADMIN) {
                userDocument.emailValidated = false;
                userDocument.role = UserRole.READONLY;
                this.loggerService.warn(
                    `User ${userDocument.id} downgraded to READONLY until email is validated`,
                );
            }
            userDocument.email = propertiesUpdated.email;
        }
        if (propertiesUpdated.password) {
            userDocument.password = await this.hashingService.hash(propertiesUpdated.password);
            this.loggerService.info(`User ${userDocument.id} password updated`);
        }
        if (propertiesUpdated.name) {
            userDocument.name = propertiesUpdated.name;
            this.loggerService.info(`User ${userDocument.id} name updated`);
        }
    }

    private async passwordsMatchOrThrow(
        hashedPassword: string,
        incomingPassword: string,
    ): Promise<void> {
        const passwordOk = await this.hashingService.compare(incomingPassword, hashedPassword);
        if (!passwordOk) {
            this.loggerService.error('Password does not match');
            throw HttpError.unAuthorized(authErrors.INVALID_CREDENTIALS);
        }
    }

    private async hashPassword(password: string): Promise<string> {
        const hash = await this.hashingService.hash(password);
        this.loggerService.debug('Password hashed successfully');
        return hash;
    }

    private async sendForgotPasswordLink(email: string): Promise<void> {
        const token = this.passwordRecoveryTokenService.generate(email);
        const link = `${this.configService.WEB_URL}api/users/reset-password?token=${token}`;
        await this.emailService.sendMail({
            html: resetYourPasswordTemplate(link),
            subject: 'Password recovery',
            to: email,
        });
        this.loggerService.info(`Password recovery email sent to ${email}`);
    }

    async requestEmailValidation(sessionUser: UserSessionInfo): Promise<void> {
        if (sessionUser.role !== UserRole.READONLY) {
            this.loggerService.error(`Email ${sessionUser.email} is already validated`);
            throw HttpError.conflict(authErrors.EMAIL_ALREADY_VERIFIED);
        }
        await this.sendEmailValidationLink(sessionUser.email);
    }

    async confirmEmailValidation(token: string): Promise<void> {
        // consume token and get email
        const emailInToken = await this.emailValidationTokenService.consume(token);
        const user = await this.userModel.findOne({ email: emailInToken }).exec();
        if (!user) {
            this.loggerService.error(`User with email ${emailInToken} not found`);
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        if (user.emailValidated === true) {
            this.loggerService.error(`User ${user.id} email is already validated`);
            throw HttpError.conflict(authErrors.EMAIL_ALREADY_VERIFIED);
        }
        // upgrade
        user.emailValidated = true;
        user.role = UserRole.EDITOR;
        await user.save();
        await this.cacheService.delete(user.id);
        this.loggerService.info(`User ${user.id} email validated, role updated to EDITOR`);
    }

    async create(user: CreateUserValidator) {
        try {
            // hashing password
            user.password = await this.hashPassword(user.password);
            // db
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

    async login(loginCredentials: LoginUserValidator) {
        // user existence
        const userDb = await this.userModel.findOne({ email: loginCredentials.email }).exec();
        if (!userDb) {
            this.loggerService.error(`User ${loginCredentials.email} not found`);
            throw HttpError.unAuthorized(authErrors.INVALID_CREDENTIALS);
        }
        // password comparison
        await this.passwordsMatchOrThrow(userDb.password, loginCredentials.password);
        // check refresh token limit
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

    async logout(requestUserInfo: UserSessionInfo, refreshToken: string): Promise<void> {
        // valid refresh token
        const { jti: refreshJti } = await this.refreshTokenService.validateOrThrow(refreshToken);
        // disable session and refresh tokens
        await allSettledAndThrow([
            this.refreshTokenService.revokeToken(requestUserInfo.id, refreshJti),
            this.sessionTokenService.blacklist(
                requestUserInfo.sessionJti,
                requestUserInfo.sessionTokenExpUnix,
            ),
        ]);
        this.loggerService.info(`User ${requestUserInfo.id} logged out`);
    }

    async logoutAll(password: string, user: UserSessionInfo): Promise<void> {
        const userData = await this.findOneByIdOrThrow(user.id);
        await this.passwordsMatchOrThrow(password, userData.password);
        await this.refreshTokenService.revokeAll(userData.id);
        this.loggerService.info(`All refresh tokens of user ${userData.id} have been revoked`);
    }

    async refresh(refreshToken: string) {
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

    async findOne(id: string, options: IFindOptions): Promise<UserDocument | UserResponse> {
        if (options.cache) {
            return await this.findOneByIdOrThrowCacheEnabled(id);
        }
        return await this.findOneByIdOrThrow(id);
    }

    async findAll(limit: number, page: number): Promise<IPagination<UserDocument>> {
        // validate limit and page
        const totalDocuments = await this.userModel.countDocuments().exec();
        const { offset, totalPages } = calculatePagination(limit, page, totalDocuments);
        const data = await this.cacheService.getPagination(offset, limit);
        return {
            currentPage: page,
            totalDocuments,
            totalPages,
            data,
        };
    }

    async deleteOne(requestUserInfo: UserSessionInfo, targetUserId: string): Promise<void> {
        await this.verifyUserModificationRights(requestUserInfo, targetUserId);
        await allSettledAndThrow([
            this.userModel.deleteOne({ _id: targetUserId }).exec(),
            this.refreshTokenService.revokeAll(targetUserId),
            this.cacheService.delete(targetUserId),
        ]);
        this.loggerService.info(`User ${targetUserId} deleted`);
        // remove all tasks associated
        const tasksRemoved = await this.tasksModel.deleteMany({ user: targetUserId }).exec();
        this.loggerService.info(
            `${tasksRemoved.deletedCount} tasks associated to user ${targetUserId} removed`,
        );
    }

    async updateOne(
        requestUserInfo: UserSessionInfo,
        targetUserId: string,
        propertiesUpdated: UpdateUserValidator,
    ): Promise<UserDocument> {
        const userDocument = await this.verifyUserModificationRights(requestUserInfo, targetUserId);
        await this.updateUserDocumentProperties(userDocument, propertiesUpdated);
        // revoke all refresh tokens and blacklist session token
        if (propertiesUpdated.email || propertiesUpdated.password) {
            await allSettledAndThrow([
                this.refreshTokenService.revokeAll(targetUserId),
                this.sessionTokenService.blacklist(
                    requestUserInfo.sessionJti,
                    requestUserInfo.sessionTokenExpUnix,
                ),
            ]);
            this.loggerService.info(
                `All refresh tokens of user ${targetUserId} were revoked due to email/password update`,
            );
        }
        try {
            await userDocument.save();
            await this.cacheService.delete(targetUserId);
            this.loggerService.info(`User ${targetUserId} updated`);
            return userDocument;
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.users, error, this.loggerService);
            throw error;
        }
    }

    async resetPassword(newPassword: string, token: string): Promise<void> {
        const emailInToken = await this.passwordRecoveryTokenService.consume(token);
        const user = await this.userModel.findOne({ email: emailInToken }).exec();
        if (!user) {
            this.loggerService.error(`User ${emailInToken} not found`);
            throw HttpError.unAuthorized(authErrors.INVALID_TOKEN);
        }
        user.password = await this.hashPassword(newPassword);
        await user.save();
        this.loggerService.info(`User ${user.id} password updated`);
        // logout all
        await this.refreshTokenService.revokeAll(user.id);
        this.loggerService.info(
            `All refresh tokens of user ${user.id} have been revoked due to password reset`,
        );
    }

    async requestPasswordRecovery(email: string): Promise<void> {
        const userInDb = await this.userModel.findOne({ email }).exec();
        if (!userInDb) {
            this.loggerService.info(
                `User with email "${email}" not found, skipping password recovery`,
            );
            return;
        }
        await this.sendForgotPasswordLink(email);
    }
}
