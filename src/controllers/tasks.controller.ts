import { LoggerService } from "@root/services";
import { TasksService } from "@root/services/tasks.service";
import { Request, Response } from "express";
import { handleError } from "@root/common/handlers/error.handler";
import { CreateTaskValidator } from "@root/rules/validators/models/tasks/create-task.validator";
import { HTTP_STATUS_CODE } from "@root/rules/constants/http-status-codes.constants";
import { getUserInfoOrHandleError } from "./handlers/get-user-info.handler";
import { UpdateTaskValidator } from "@root/rules/validators/models/tasks/update-task.validator";
import { PAGINATION_SETTINGS } from "@root/rules/constants/pagination.constants";

export class TasksController {

    constructor(
        private readonly tasksService: TasksService,
        private readonly loggerService: LoggerService,
    ) {}

    readonly create = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('Task creation attempt');
            const [error, validatedTask] = await CreateTaskValidator
                .validateAndTransform(req.body);

            if (validatedTask) {
                this.loggerService.info('Task data successfully validated');
                const requestUserInfo = getUserInfoOrHandleError(req, res);

                if (requestUserInfo) {
                    const created = await this.tasksService.create(validatedTask, requestUserInfo.id);
                    res.status(HTTP_STATUS_CODE.CREATED).json(created);
                    return;
                }

            } else {
                this.loggerService.error('Task data validation failed'); 
                res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error });
                return;
            }

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly findOne = async (req: Request, res: Response): Promise<void> => {
        try {
            const id = req.params.id;
            const taskFound = await this.tasksService.findOne(id);
            res.status(HTTP_STATUS_CODE.OK).json(taskFound);
        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly findAll = async (req: Request, res: Response): Promise<void> => {
        try {
            const limit = (req.query.limit) ? +req.query.limit : PAGINATION_SETTINGS.DEFAULT_LIMIT;
            const page = (req.query.page) ? +req.query.page : PAGINATION_SETTINGS.DEFAULT_PAGE;
            const tasksFound = await this.tasksService.findAll(limit, page);
            res.status(HTTP_STATUS_CODE.OK).json(tasksFound);
        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly findAllByUser = async (req: Request, res: Response): Promise<void> => {
        try {
            const userId = req.params.id;
            const tasksFound = await this.tasksService.findAllByUser(userId);
            res.status(HTTP_STATUS_CODE.OK).json(tasksFound);
        } catch (error) {
            handleError(res, error,this.loggerService);
        }
    }

    readonly deleteOne = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('Task deletion attempt');
            const id = req.params.id;
            const requestUserInfo = getUserInfoOrHandleError(req, res);

            if (requestUserInfo) {
                await this.tasksService.deleteOne(requestUserInfo, id);
                res.status(HTTP_STATUS_CODE.NO_CONTENT).end()
                return;
            }

        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }

    readonly updateOne = async (req: Request, res: Response): Promise<void> => {
        try {
            this.loggerService.info('Task update attempt');
            const id = req.params.id;
            const [error, validatedTask] = await UpdateTaskValidator
                .validateAndTransform(req.body);

            if (validatedTask) {
                this.loggerService.info('Task data successfully validated');
                const requestUserInfo = getUserInfoOrHandleError(req, res);

                if (requestUserInfo) {
                    const updated = await this.tasksService.updateOne(requestUserInfo, id, validatedTask);
                    res.status(HTTP_STATUS_CODE.OK).json(updated);
                    return;
                }

            } else {
                this.loggerService.error('Task data validation failed'); 
                res.status(HTTP_STATUS_CODE.BADREQUEST).json({ error });
                return;
            }
        } catch (error) {
            handleError(res, error, this.loggerService);
        }
    }
}