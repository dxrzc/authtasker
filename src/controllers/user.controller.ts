import { Request, Response } from "express";
import { UserService } from "@root/services/user.service";
import { LoggerService } from "@root/services/logger.service";
import { statusCodes } from '@root/common/constants/status-codes.constants';
import { paginationSettings } from '@root/common/constants/pagination.constants';
import { BaseUserController } from '@root/common/base/base-user-controller.class';
import { CreateUserValidator } from '@root/validators/models/user/create-user.validator';
import { UpdateUserValidator } from '@root/validators/models/user/update-user.validator';
import { LoginUserValidator } from '@root/validators/models/user/login-user.validator';

export class UserController extends BaseUserController {
    
    constructor(
        private readonly userService: UserService,
        private readonly loggerService: LoggerService,
        private readonly createUserValidator: CreateUserValidator,
        private readonly updateUserValidator: UpdateUserValidator,
        private readonly loginUserValidator: LoginUserValidator,        
    ) { super(); }

    protected readonly create = async (req: Request, res: Response): Promise<void> => {
        this.loggerService.info('User creation attempt');
        const user = req.body;
        const [error, validatedUser] = await this.createUserValidator.validateProperties(user);

        if (!validatedUser) {
            this.loggerService.error(`Data validation failed`);
            res.status(statusCodes.BAD_REQUEST).json({ error });
            return;
        }

        this.loggerService.info(`Data successfully validated`);
        const created = await this.userService.create(validatedUser);
        res.status(statusCodes.CREATED).json(created);
    }

    protected readonly login = async (req: Request, res: Response): Promise<void> => {
        this.loggerService.info('User login attempt');
        const user = req.body;
        const [error, validatedUser] = await this.loginUserValidator.validate(user);

        if (!validatedUser) {
            this.loggerService.error(`Data validation failed`);
            res.status(statusCodes.BAD_REQUEST).json({ error });
            return;
        }

        this.loggerService.info(`Data successfully validated`);
        const loggedIn = await this.userService.login(validatedUser);
        res.status(statusCodes.OK).json(loggedIn);
    }

    protected readonly logout = async (req: Request, res: Response): Promise<void> => {
        this.loggerService.info('User logout attempt');
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.userService.logout(requestUserInfo);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly requestEmailValidation = async (req: Request, res: Response): Promise<void> => {
        this.loggerService.info('Email validation request attempt');
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.userService.requestEmailValidation(requestUserInfo.id);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly confirmEmailValidation = async (req: Request, res: Response): Promise<void> => {
        this.loggerService.info('Email confirmation attempt');
        const token = req.params.token;
        if (!token) {
            this.loggerService.error('Can not confirm email, no token provided');
            res.status(statusCodes.BAD_REQUEST).json({ error: 'No token provided' });
            return;
        }
        await this.userService.confirmEmailValidation(token);
        res.status(statusCodes.OK).send({ message: 'Email successfully validated' });
    }

    protected readonly findOne = async (req: Request, res: Response): Promise<void> => {
        const id = req.params.id;
        this.loggerService.info(`User ${id} search attempt`);
        const userFound = await this.userService.findOne(id);
        res.status(statusCodes.OK).json(userFound);
    }

    protected readonly findAll = async (req: Request, res: Response): Promise<void> => {
        this.loggerService.info(`Users search attempt`);
        const limit = (req.query.limit) ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = (req.query.page) ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const usersFound = await this.userService.findAll(limit, page);
        res.status(statusCodes.OK).json(usersFound);
    }

    protected readonly deleteOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToDelete = req.params.id;
        this.loggerService.info(`User ${userIdToDelete} deletion attempt`);
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.userService.deleteOne(requestUserInfo, userIdToDelete);
        res.status(statusCodes.NO_CONTENT).end();
    }

    protected readonly updateOne = async (req: Request, res: Response): Promise<void> => {
        const userIdToUpdate = req.params.id;
        this.loggerService.info(`User ${userIdToUpdate} update attempt`);
        const propertiesToUpdate = req.body;
        const [error, validProps] = await this.updateUserValidator.validateNewProperties(propertiesToUpdate);

        if (!validProps) {
            this.loggerService.error(`Data validation failed`);
            res.status(statusCodes.BAD_REQUEST).json({ error });
            return;
        }

        this.loggerService.info(`Data successfully validated`);
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const updated = await this.userService.updateOne(requestUserInfo, userIdToUpdate, validProps);
        res.status(statusCodes.OK).json(updated);
    }
}