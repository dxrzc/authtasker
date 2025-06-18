import { Request, Response } from "express";
import { TasksService } from '@root/services/tasks.service';
import { LoggerService } from '@root/services/logger.service';
import { statusCodes } from '@root/common/constants/status-codes.constants';
import { paginationSettings } from '@root/common/constants/pagination.constants';
import { BaseTasksController } from '@root/common/base/base-tasks-controller.class';
import { CreateTaskValidator } from '@root/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from '@root/validators/models/tasks/update-task.validator';

export class TasksController extends BaseTasksController {

    constructor(
        private readonly tasksService: TasksService,
        private readonly loggerService: LoggerService,
        private readonly createTaskValidator: CreateTaskValidator,
        private readonly updateTaskValidator: UpdateTaskValidator
    ) { super(); }

    protected readonly create = async (req: Request, res: Response) => {
        this.loggerService.info('Task creation attempt');        
        const validTask = await this.createTaskValidator.validateAndTransform(req.body);
        this.loggerService.info('Data successfully validated');
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const created = await this.tasksService.create(validTask, requestUserInfo.id);
        res.status(statusCodes.CREATED).json(created);
    };

    protected readonly findOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        this.loggerService.info(`Task ${id} search attempt`);
        const taskFound = await this.tasksService.findOne(id);
        res.status(statusCodes.OK).json(taskFound);
    };

    protected readonly findAll = async (req: Request, res: Response) => {
        this.loggerService.info('Tasks search attempt');
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const tasksFound = await this.tasksService.findAll(limit, page);
        res.status(statusCodes.OK).json(tasksFound);
    };

    protected readonly findAllByUser = async (req: Request, res: Response) => {
        const userId = req.params.id;
        this.loggerService.info(`Tasks by user ${userId} search attempt`);
        const tasksFound = await this.tasksService.findAllByUser(userId);
        res.status(statusCodes.OK).json(tasksFound);
    };

    protected readonly deleteOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        this.loggerService.info(`Task ${id} deletion attempt`);
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.tasksService.deleteOne(requestUserInfo, id);
        res.status(statusCodes.NO_CONTENT).end();
    };

    protected readonly updateOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        this.loggerService.info(`Task ${id} update attempt`);
        const validUpdate = await this.updateTaskValidator.validateNewAndTransform(req.body);
        this.loggerService.info('Data successfully validated');
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const updated = await this.tasksService.updateOne(requestUserInfo, id, validUpdate);
        res.status(statusCodes.OK).json(updated);
    };
}