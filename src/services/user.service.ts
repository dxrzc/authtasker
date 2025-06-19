import { Model, Types } from "mongoose";
import { Apis } from '@root/enums/apis.enum';
import { CacheService } from './cache.service';
import { EmailService } from '@root/services/email.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { ConfigService } from '@root/services/config.service';
import { LoggerService } from '@root/services/logger.service';
import { SessionTokenService } from './session-token.service';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { HashingService } from '@root/services/hashing.service';
import { paginationRules } from '@logic/pagination/pagination-rules';
import { UserResponse } from '@root/types/user/user-response.type';
import { UserDocument } from '@root/types/user/user-document.type';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { UserIdentity } from '@root/interfaces/user/user-indentity.interface';
import { ICacheOptions } from '@root/interfaces/cache/cache-options.interface';
import { EmailValidationTokenService } from './email-validation-token.service';
import { UserFromRequest } from '@root/interfaces/user/user-from-request.interface';
import { handleDuplicatedKeyInDb } from '@logic/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from '@logic/roles/modification-access-control';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { LoginUserValidator } from '@root/validators/models/user/login-user.validator';
import { CreateUserValidator } from '@root/validators/models/user/create-user.validator';
import { UpdateUserValidator } from '@root/validators/models/user/update-user.validator';

export class UserService {

    constructor(
        private readonly configService: ConfigService,
        private readonly userModel: Model<IUser>,
        private readonly tasksModel: Model<ITasks>,
        private readonly hashingService: HashingService,
        private readonly loggerService: LoggerService,
        private readonly emailService: EmailService,
        private readonly sessionTokenService: SessionTokenService,
        private readonly emailValidationTokenService: EmailValidationTokenService,
        private readonly cacheService: CacheService<UserResponse>,
    ) {}

    private async findUserInDb(id: string): Promise<UserDocument> {
        const userInDb = await this.userModel.findById(id).exec();
        if (!userInDb) {
            this.loggerService.error(`User ${id} not found`)
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        return userInDb;
    }

    private async authorizeUserModificationOrThrow(requestUserInfo: UserIdentity, targetUserId: string): Promise<UserDocument> {
        const targetUserDocument = await this.findOne(targetUserId, { noStore: true }) as UserDocument;
        const isCurrentUserAuthorized = modificationAccessControl(requestUserInfo, {
            id: targetUserId,
            role: targetUserDocument.role
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

    private async setNewPropertiesInDocument(userDocument: UserDocument, propertiesUpdated: UpdateUserValidator): Promise<void> {
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
            userDocument.name = propertiesUpdated.name
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

    async create(user: CreateUserValidator): Promise<{ user: UserDocument, token: string }> {
        try {
            // password hashing
            const passwordHash = await this.hashingService.hash(user.password);
            user.password = passwordHash;
            // creation in db
            const created = await this.userModel.create(user);
            // token generation
            const token = this.sessionTokenService.generate(created.id);
            this.loggerService.info(`User ${created.id} created`);
            return {
                user: created,
                token,
            };

        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.users, error, this.loggerService);
            throw error;
        }
    }

    async login(userToLogin: LoginUserValidator): Promise<{ user: UserDocument, token: string }> {
        // check user existence
        const userDb = await this.userModel.findOne({ email: userToLogin.email }).exec();
        if (!userDb) {
            this.loggerService.error(`User ${userToLogin.email} not found`);
            throw HttpError.badRequest(authErrors.INVALID_CREDENTIALS);
        }
        // check password
        const passwordOk = await this.hashingService.compare(userToLogin.password, userDb.password);
        if (!passwordOk) {
            this.loggerService.error('Password does not match');
            throw HttpError.badRequest(authErrors.INVALID_CREDENTIALS);
        }
        // token generation
        const token = this.sessionTokenService.generate(userDb.id);
        this.loggerService.info(`User ${userDb.id} logged in`);
        return {
            user: userDb,
            token,
        };
    }

    async logout(requestUserInfo: UserFromRequest): Promise<void> {
        await this.sessionTokenService.blacklist(requestUserInfo.jti, requestUserInfo.tokenExp);
        this.loggerService.info(`User ${requestUserInfo.id} logged out`);
    }

    async findOne(id: string, options: ICacheOptions): Promise<UserDocument | UserResponse> {
        // validate id 
        const validMongoId = Types.ObjectId.isValid(id);
        if (!validMongoId) {
            this.loggerService.error(`Invalid mongo id`)
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(`Bypassing cache for user ${id}`);
            return await this.findUserInDb(id);
        }
        // check if user is cached
        const userInCache = await this.cacheService.get(id);
        if (userInCache)
            return userInCache;
        // user is not in cache
        const userFound = await this.findUserInDb(id);
        await this.cacheService.cache(userFound);
        return userFound;
    }

    async findAll(limit: number, page: number): Promise<UserDocument[]> {
        const totalDocuments = await this.userModel.countDocuments().exec();
        if (totalDocuments === 0) return [];
        const offset = await paginationRules(limit, page, totalDocuments);
        return await this.userModel
            .find()
            .skip(offset)
            .limit(limit)
            .sort({ name: 'asc' })
            .exec();
    }

    async deleteOne(requestUserInfo: UserIdentity, targetUserId: string): Promise<void> {
        await this.authorizeUserModificationOrThrow(requestUserInfo, targetUserId);
        await this.userModel.deleteOne({ _id: targetUserId });
        this.loggerService.info(`User ${targetUserId} deleted`);
        // remove all tasks associated
        const tasksRemoved = await this.tasksModel.deleteMany({ user: targetUserId });
        this.loggerService.info(`${tasksRemoved.deletedCount} tasks associated to user removed`);
    }

    async updateOne(requestUserInfo: UserIdentity, targetUserId: string, propertiesUpdated: UpdateUserValidator): Promise<UserDocument> {
        const userDocument = await this.authorizeUserModificationOrThrow(requestUserInfo, targetUserId);
        await this.setNewPropertiesInDocument(userDocument, propertiesUpdated);
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
}