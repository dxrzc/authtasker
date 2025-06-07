import { Request, Response, NextFunction } from "express";
import { LoggerService, TasksService } from "@root/services";
import { BaseController } from '@root/common/base';
import { CreateTaskValidator, UpdateTaskValidator } from '@root/validators/models/tasks';
import { paginationSettings, statusCodes } from '@root/common/constants';

export class TasksController extends BaseController {

    constructor(
        private readonly tasksService: TasksService,
        private readonly loggerService: LoggerService,
    ) { super(); }

    readonly create = this.forwardError(async (req: Request, res: Response, next: NextFunction) => {
        this.loggerService.info('Task creation attempt');
        const [error, validatedTask] = await CreateTaskValidator.validateAndTransform(req.body);

        if (validatedTask) {
            this.loggerService.info('Data successfully validated');
            const requestUserInfo = this.getUserRequestInfo(req, res);

            if (requestUserInfo) {
                const created = await this.tasksService.create(validatedTask, requestUserInfo.id);
                res.status(statusCodes.CREATED).json(created);
                return;
            }

        } else {
            this.loggerService.error('Data validation failed');
            res.status(statusCodes.BAD_REQUEST).json({ error });
            return;
        }
    });
    
    readonly findOne = this.forwardError(async (req: Request, res: Response) => {
        const id = req.params.id;
        this.loggerService.info(`Task ${id} search attempt`);
        const taskFound = await this.tasksService.findOne(id);
        res.status(statusCodes.OK).json(taskFound);
    });

    readonly findAll = this.forwardError(async (req: Request, res: Response) => {
        this.loggerService.info('Tasks search attempt');
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const tasksFound = await this.tasksService.findAll(limit, page);
        res.status(statusCodes.OK).json(tasksFound);
    });

    readonly findAllByUser = this.forwardError(async (req: Request, res: Response) => {
        const userId = req.params.id;
        this.loggerService.info(`Tasks by user ${userId} search attempt`);
        const tasksFound = await this.tasksService.findAllByUser(userId);
        res.status(statusCodes.OK).json(tasksFound);
    });

    readonly deleteOne = this.forwardError(async (req: Request, res: Response) => {
        const id = req.params.id;
        this.loggerService.info(`Task ${id} deletion attempt`);
        const requestUserInfo = this.getUserRequestInfo(req, res);
        if (requestUserInfo) {
            await this.tasksService.deleteOne(requestUserInfo, id);
            res.status(statusCodes.NO_CONTENT).end();
        }
    });

    readonly updateOne = this.forwardError(async (req: Request, res: Response) => {
        const id = req.params.id;
        this.loggerService.info(`Task ${id} update attempt`);
        const [error, validatedTask] = await UpdateTaskValidator.validateAndTransform(req.body);

        if (validatedTask) {
            this.loggerService.info('Data successfully validated');
            const requestUserInfo = this.getUserRequestInfo(req, res);

            if (requestUserInfo) {
                const updated = await this.tasksService.updateOne(requestUserInfo, id, validatedTask);
                res.status(statusCodes.OK).json(updated);
            }
        } else {
            this.loggerService.error('Data validation failed');
            res.status(statusCodes.BAD_REQUEST).json({ error });
        }
    });
}