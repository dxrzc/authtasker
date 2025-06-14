import { Apis } from '@root/enums/apis.enum';
import { HydratedDocument, Model, Types } from "mongoose";
import { EmailService } from '@root/services/email.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { ConfigService } from '@root/services/config.service';
import { LoggerService } from '@root/services/logger.service';
import { SessionTokenService } from './session-token.service';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { HashingService } from '@root/services/hashing.service';
import { paginationRules } from '@logic/others/pagination-rules';
import { UserDocument } from '@root/types/user/user-document.type';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { UserIdentity } from '@root/interfaces/user/user-indentity.interface';
import { EmailValidationTokenService } from './email-validation-token.service';
import { UserFromRequest } from '@root/interfaces/user/user-from-request.interface';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { LoginUserValidator } from '@root/validators/models/user/login-user.validator';
import { CreateUserValidator } from '@root/validators/models/user/create-user.validator';
import { UpdateUserValidator } from '@root/validators/models/user/update-user.validator';
import { handleDuplicatedKeyInDb } from '@logic/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from '@logic/roles/modification-access-control';

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
    ) {}

    private async authorizeUserModification(requestUserInfo: UserIdentity, targetUserId: string): Promise<UserDocument> {
        const targetUser = await this.findOne(targetUserId);
        const isCurrentUserAuthorized = modificationAccessControl(requestUserInfo, {
            role: targetUser.role,
            id: targetUser.id
        });
        if (!isCurrentUserAuthorized) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        return targetUser;
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

    private async setUserDocumentNewProperties(userToUpdate: UserDocument, propertiesUpdated: UpdateUserValidator) {
        // updating email
        if (propertiesUpdated.email) {
            if (userToUpdate.role !== 'admin') {
                userToUpdate.emailValidated = false;
                userToUpdate.role = 'readonly';
            }
            userToUpdate.email = propertiesUpdated.email;
        }
        // updating password
        if (propertiesUpdated.password) {
            userToUpdate.password = await this.hashingService.hash(propertiesUpdated.password);
        }
        // updating name
        if (propertiesUpdated.name) {
            userToUpdate.name = propertiesUpdated.name
        }
        return userToUpdate;
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

    async findOne(id: string): Promise<UserDocument> {
        let userDb;
        if (Types.ObjectId.isValid(id))
            userDb = await this.userModel.findById(id).exec();
        // id is not valid / user not found
        if (!userDb) {
            this.loggerService.error(`User ${id} not found`)
            throw HttpError.notFound(usersApiErrors.USER_NOT_FOUND);
        }
        return userDb;
    }

    async findAll(limit: number, page: number): Promise<UserDocument[]> {
        const offset = await paginationRules(limit, page, this.userModel);
        // no documents found
        if (offset instanceof Array)
            return [];
        return await this.userModel
            .find()
            .skip(offset)
            .limit(limit)
            .sort({ name: 'asc' })
            .exec();
    }

    async deleteOne(requestUserInfo: UserIdentity, targetUserId: string): Promise<void> {
        const targetUser = await this.authorizeUserModification(requestUserInfo, targetUserId);
        await targetUser.deleteOne().exec();
        this.loggerService.info(`User ${targetUserId} deleted`);
        // remove all tasks associated
        const tasksRemoved = await this.tasksModel.deleteMany({ user: targetUser.id });
        this.loggerService.info(`${tasksRemoved.deletedCount} tasks associated to user removed`);
    }

    async updateOne(requestUserInfo: UserIdentity, targetUserId: string, propertiesUpdated: UpdateUserValidator): Promise<HydratedDocument<IUser>> {
        const targetUser = await this.authorizeUserModification(requestUserInfo, targetUserId);
        await this.setUserDocumentNewProperties(targetUser, propertiesUpdated);
        try {
            await targetUser.save();
            this.loggerService.info(`User ${targetUserId} updated`);
            return targetUser;
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.users, error, this.loggerService);
            throw error;
        }
    }
}