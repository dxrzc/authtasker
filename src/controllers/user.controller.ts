import { Request, Response } from "express";
import { CreateUserValidator, LoginUserValidator } from "@root/rules/validators/models/user";
import { getUserInfoOrHandleError } from "./handlers/get-user-info.handler";
import { handleError } from "@root/common/handlers/error.handler";
import { HTTP_STATUS_CODE, PAGINATION_SETTINGS } from "@root/rules/constants";
import { LoggerService } from "@root/services/logger.service";
import { UpdateUserValidator } from "@root/rules/validators/models/user/update-user.validator";
import { UserService } from "@root/services/user.service";

export class UserController {

    constructor(
        private readonly userService: UserService,
        private readonly loggerService: LoggerService,
    ) {}

    readonly create = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('User creation attempt');
            const user = req.body;
            const [error, validatedUser] = await CreateUserValidator
                .validateAndTransform(user);

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

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    };

    readonly login = async (req: Request, res: Response): Promise<void> => {
        try {
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

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly logout = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('User logout attempt');
            const requestUserInfo = getUserInfoOrHandleError(req, res);

            if (requestUserInfo) {
                await this.userService.logout(requestUserInfo);
                res.status(HTTP_STATUS_CODE.NO_CONTENT).end();
                return;
            }

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly requestEmailValidation = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('Email validation request attempt');
            const requestUserInfo = getUserInfoOrHandleError(req, res);

            if (requestUserInfo) {
                await this.userService.requestEmailValidation(requestUserInfo.id);
                res.status(HTTP_STATUS_CODE.NO_CONTENT).end();
                return;
            }

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly confirmEmailValidation = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('Email confirmation attempt');
            const token = req.params.token;

            if (!token) {
                this.loggerService.error('Can not confirm email, no token provided');
                res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error: 'No token provided' });
                return;
            }

            await this.userService.confirmEmailValidation(token);
            res.status(HTTP_STATUS_CODE.OK).send({ message: 'Email successfully validated' });

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly findOne = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            this.loggerService.info(`User ${id} search attempt`);
            const userFound = await this.userService.findOne(id);
            res.status(HTTP_STATUS_CODE.OK).json(userFound);
        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly findAll = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info(`Users search attempt`);
            const limit = (req.query.limit) ? +req.query.limit : PAGINATION_SETTINGS.DEFAULT_LIMIT;
            const page = (req.query.page) ? +req.query.page : PAGINATION_SETTINGS.DEFAULT_PAGE;
            const usersFound = await this.userService.findAll(limit, page);
            res.status(HTTP_STATUS_CODE.OK).json(usersFound);
        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly deleteOne = async (req: Request, res: Response): Promise<void> => {
        try {
            const userIdToDelete = req.params.id;
            this.loggerService.info(`User ${userIdToDelete} deletion attempt`);
            const requestUserInfo = getUserInfoOrHandleError(req, res);

            if (requestUserInfo) {
                await this.userService.deleteOne(requestUserInfo, userIdToDelete);
                res.status(HTTP_STATUS_CODE.NO_CONTENT).end();
                return;
            }

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly updateOne = async (req: Request, res: Response): Promise<void> => {
        try {
            const userIdToUpdate = req.params.id;
            this.loggerService.info(`User ${userIdToUpdate} update attempt`);
            const propertiesToUpdate = req.body;

            const [error, validatedProperties] = await UpdateUserValidator
                .validateAndTransform(propertiesToUpdate);

            if (validatedProperties) {
                this.loggerService.info(`Data successfully validated`);
                const requestUserInfo = getUserInfoOrHandleError(req, res);

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
        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }
}