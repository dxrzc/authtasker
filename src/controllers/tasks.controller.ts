import { Request, Response } from "express";
import { TasksService } from 'src/services/tasks.service';
import { LoggerService } from 'src/services/logger.service';
import { statusCodes } from 'src/common/constants/status-codes.constants';
import { paginationSettings } from 'src/common/constants/pagination.constants';
import { BaseTasksController } from 'src/common/base/base-tasks-controller.class';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from 'src/validators/models/tasks/update-task.validator';
import { buildCacheOptions } from '@logic/cache/build-cache-options';

export class TasksController extends BaseTasksController {

    constructor(
        private readonly tasksService: TasksService,        
        private readonly createTaskValidator: CreateTaskValidator,
        private readonly updateTaskValidator: UpdateTaskValidator
    ) { super(); }

    protected readonly create = async (req: Request, res: Response) => {        
        const validTask = await this.createTaskValidator.validateAndTransform(req.body);        
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const created = await this.tasksService.create(validTask, requestUserInfo.id);
        res.status(statusCodes.CREATED).json(created);
    };

    protected readonly findOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        const options = buildCacheOptions(req);        
        const taskFound = await this.tasksService.findOne(id, options);
        res.status(statusCodes.OK).json(taskFound);
    };

    protected readonly findAll = async (req: Request, res: Response) => {        
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const options = buildCacheOptions(req);
        const tasksFound = await this.tasksService.findAll(limit, page, options);
        res.status(statusCodes.OK).json(tasksFound);
    };

    protected readonly findAllByUser = async (req: Request, res: Response) => {
        const userId = req.params.id;        
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const cacheOptions = buildCacheOptions(req);
        const tasksFound = await this.tasksService.findAllByUser(userId, limit, page, cacheOptions);
        res.status(statusCodes.OK).json(tasksFound);
    };

    protected readonly deleteOne = async (req: Request, res: Response) => {
        const id = req.params.id;        
        const requestUserInfo = this.getUserRequestInfo(req, res);
        await this.tasksService.deleteOne(requestUserInfo, id);
        res.status(statusCodes.NO_CONTENT).end();
    };

    protected readonly updateOne = async (req: Request, res: Response) => {
        const id = req.params.id;        
        const validUpdate = await this.updateTaskValidator.validateNewAndTransform(req.body);        
        const requestUserInfo = this.getUserRequestInfo(req, res);
        const updated = await this.tasksService.updateOne(requestUserInfo, id, validUpdate);
        res.status(statusCodes.OK).json(updated);
    };
}