import { HydratedDocument, Model, Types } from "mongoose";
import { EmailService } from '@root/services/email.service';
import { UserRole } from '@root/types/user/user-roles.type';
import { IUser } from '@root/interfaces/user/user.interface';
import { ConfigService } from '@root/services/config.service';
import { LoggerService } from '@root/services/logger.service';
import { SessionTokenService } from './session-token.service';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { HashingService } from '@root/services/hashing.service';
import { paginationRules } from '@logic/others/pagination-rules';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { EmailValidationTokenService } from './email-validation-token.service';
import { UserFromRequest } from '@root/interfaces/user/user-from-request.interface';
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
    ) {}

    private handleDbDuplicatedKeyError(error: any): never {
        // - keyValue: {name: 'user123'}
        const duplicatedKey = Object.keys(error.keyValue).at(0);
        const keyValue = Object.values(error.keyValue).at(0);
        this.loggerService.error(`User with ${duplicatedKey} "${keyValue}" already exists`);
        throw HttpError.conflict(usersApiErrors.USER_ALREADY_EXISTS);
    }

    private async getUserIfAuthorizedToModify(requestUserInfo: { id: string, role: UserRole }, userIdToUpdate: string): Promise<HydratedDocument<IUser> | null> {
        const userToModify = await this.findOne(userIdToUpdate);
        // admin users can modify other users (but not other admins)
        if (requestUserInfo.role === 'admin' && userToModify.role !== 'admin')
            return userToModify;
        // users can modify themselves
        if (requestUserInfo.id === userToModify.id)
            return userToModify;
        return null;
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

    private async setUserDocumentNewProperties(userToUpdate: HydratedDocument<IUser>, propertiesUpdated: UpdateUserValidator) {
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

    async create(user: CreateUserValidator): Promise<{ user: HydratedDocument<IUser>, token: string }> {
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
                this.handleDbDuplicatedKeyError(error);
            throw error;
        }
    }

    async login(userToLogin: LoginUserValidator): Promise<{ user: HydratedDocument<IUser>, token: string }> {
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

    async findOne(id: string): Promise<HydratedDocument<IUser>> {
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

    async findAll(limit: number, page: number): Promise<HydratedDocument<IUser>[]> {
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

    async deleteOne(requestUserInfo: { id: string, role: UserRole }, id: string): Promise<void> {
        // check if current user is authorized
        const userToDelete = await this.getUserIfAuthorizedToModify(requestUserInfo, id);
        if (!userToDelete) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        await userToDelete.deleteOne().exec();
        this.loggerService.info(`User ${id} deleted`);
        // remove all tasks associated
        const tasksRemoved = await this.tasksModel.deleteMany({ user: userToDelete.id });
        this.loggerService.info(`${tasksRemoved.deletedCount} tasks associated to user removed`);
    }

    async updateOne(requestUserInfo: { id: string, role: UserRole }, id: string, propertiesUpdated: UpdateUserValidator): Promise<HydratedDocument<IUser>> {
        try {
            // check if current user is authorized
            const userToUpdate = await this.getUserIfAuthorizedToModify(requestUserInfo, id);
            if (!userToUpdate) {
                this.loggerService.error(`Not authorized to perform this action`);
                throw HttpError.forbidden(authErrors.FORBIDDEN);
            }
            // set new properties requires specific logic
            await this.setUserDocumentNewProperties(userToUpdate, propertiesUpdated);
            await userToUpdate.save();
            this.loggerService.info(`User ${id} updated`);
            return userToUpdate;

        } catch (error: any) {
            if (error.code === 11000)
                this.handleDbDuplicatedKeyError(error);
            throw error;
        }
    }
}