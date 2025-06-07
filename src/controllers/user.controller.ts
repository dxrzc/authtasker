import { NextFunction, Request, Response } from "express";
import { CreateUserValidator, LoginUserValidator } from "@root/rules/validators/models/user";
import { HTTP_STATUS_CODE, PAGINATION_SETTINGS } from "@root/rules/constants";
import { LoggerService } from "@root/services/logger.service";
import { UpdateUserValidator } from "@root/rules/validators/models/user/update-user.validator";
import { UserService } from "@root/services/user.service";
import { BaseController } from '@root/common/classes';

export class UserController extends BaseController {

    constructor(
        private readonly userService: UserService,
        private readonly loggerService: LoggerService,
    ) { super(); }

    readonly create = this.forwardError(async (req: Request, res: Response, next: NextFunction) => {
        this.loggerService.info('User creation attempt');
        const user = req.body;
        const [error, validatedUser] = await CreateUserValidator.validateAndTransform(user);
        if (validatedUser) {
            this.loggerService.info(`Data successfully validated`);
            const created = await this.userService.create(validatedUser);
            res.status(HTTP_STATUS_CODE.CREATED).json(created);
            return;
        } else {
            this.loggerService.error(`Data validation failed`);
            res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error });
            return;
        }
    });

    readonly login = this.forwardError(async (req: Request, res: Response, next: NextFunction) => {
        this.loggerService.info('User login attempt');
        const user = req.body;
        const [error, validatedUser] = await LoginUserValidator.validate(user);
        if (validatedUser) {
            this.loggerService.info(`Data successfully validated`);
            const loggedIn = await this.userService.login(validatedUser);
            res.status(HTTP_STATUS_CODE.OK).json(loggedIn);
            return;
        } else {
            this.loggerService.error(`Data validation failed`);
            res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error });
            return;
        }
    });

    readonly logout = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        this.loggerService.info('User logout attempt');
        const requestUserInfo = this.getUserRequestInfo(req, res);
        if (requestUserInfo) {
            await this.userService.logout(requestUserInfo);
            res.status(HTTP_STATUS_CODE.NO_CONTENT).end();
            return;
        }
    });

    readonly requestEmailValidation = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        this.loggerService.info('Email validation request attempt');
        const requestUserInfo = this.getUserRequestInfo(req, res);
        if (requestUserInfo) {
            await this.userService.requestEmailValidation(requestUserInfo.id);
            res.status(HTTP_STATUS_CODE.NO_CONTENT).end();
            return;
        }
    });

    readonly confirmEmailValidation = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        this.loggerService.info('Email confirmation attempt');
        const token = req.params.token;
        if (!token) {
            this.loggerService.error('Can not confirm email, no token provided');
            res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error: 'No token provided' });
            return;
        }
        await this.userService.confirmEmailValidation(token);
        res.status(HTTP_STATUS_CODE.OK).send({ message: 'Email successfully validated' });
    });

    readonly findOne = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const id = req.params.id;
        this.loggerService.info(`User ${id} search attempt`);
        const userFound = await this.userService.findOne(id);
        res.status(HTTP_STATUS_CODE.OK).json(userFound);
    });

    readonly findAll = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        this.loggerService.info(`Users search attempt`);
        const limit = (req.query.limit) ? +req.query.limit : PAGINATION_SETTINGS.DEFAULT_LIMIT;
        const page = (req.query.page) ? +req.query.page : PAGINATION_SETTINGS.DEFAULT_PAGE;
        const usersFound = await this.userService.findAll(limit, page);
        res.status(HTTP_STATUS_CODE.OK).json(usersFound);
    });

    readonly deleteOne = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userIdToDelete = req.params.id;
        this.loggerService.info(`User ${userIdToDelete} deletion attempt`);
        const requestUserInfo = this.getUserRequestInfo(req, res);
        if (requestUserInfo) {
            await this.userService.deleteOne(requestUserInfo, userIdToDelete);
            res.status(HTTP_STATUS_CODE.NO_CONTENT).end();
            return;
        }
    });

    readonly updateOne = this.forwardError(async (req: Request, res: Response, next: NextFunction): Promise<void> => {
        const userIdToUpdate = req.params.id;
        this.loggerService.info(`User ${userIdToUpdate} update attempt`);
        const propertiesToUpdate = req.body;
        const [error, validatedProperties] = await UpdateUserValidator
            .validateAndTransform(propertiesToUpdate);
        if (validatedProperties) {
            this.loggerService.info(`Data successfully validated`);
            const requestUserInfo = this.getUserRequestInfo(req, res);

            if (requestUserInfo) {
                const updated = await this.userService.updateOne(requestUserInfo, userIdToUpdate, validatedProperties);
                res.status(HTTP_STATUS_CODE.OK).json(updated);
                return;
            }

        } else {
            this.loggerService.error(`Data validation failed`);
            res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error });
            return;
        }
    });
}