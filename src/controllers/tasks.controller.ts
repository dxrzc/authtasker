import { Request, Response } from 'express';
import { TasksService } from 'src/services/tasks.service';
import { statusCodes } from 'src/constants/status-codes.constants';
import { paginationSettings } from 'src/constants/pagination.constants';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from 'src/validators/models/tasks/update-task.validator';
import { buildCacheOptions } from 'src/functions/cache/build-cache-options';
import { userInfoInReq } from 'src/functions/express/user-info-in-req';

export class TasksController {
    constructor(
        private readonly tasksService: TasksService,
        private readonly createTaskValidator: CreateTaskValidator,
        private readonly updateTaskValidator: UpdateTaskValidator,
    ) {}

    public readonly create = async (req: Request, res: Response) => {
        const validTask = await this.createTaskValidator.validateAndTransform(req.body);
        const requestUserInfo = userInfoInReq(req);
        const created = await this.tasksService.create(validTask, requestUserInfo.id);
        res.status(statusCodes.CREATED).json(created);
    };

    public readonly findOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        const options = buildCacheOptions(req);
        const taskFound = await this.tasksService.findOne(id, options);
        res.status(statusCodes.OK).json(taskFound);
    };

    public readonly findAll = async (req: Request, res: Response) => {
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const options = buildCacheOptions(req);
        const tasksFound = await this.tasksService.findAll(limit, page, options);
        res.status(statusCodes.OK).json(tasksFound);
    };

    public readonly findAllByUser = async (req: Request, res: Response) => {
        const userId = req.params.id;
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const cacheOptions = buildCacheOptions(req);
        const tasksFound = await this.tasksService.findAllByUser(userId, limit, page, cacheOptions);
        res.status(statusCodes.OK).json(tasksFound);
    };

    public readonly deleteOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        const requestUserInfo = userInfoInReq(req);
        await this.tasksService.deleteOne(requestUserInfo, id);
        res.status(statusCodes.NO_CONTENT).end();
    };

    public readonly updateOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        const validUpdate = await this.updateTaskValidator.validateNewAndTransform(req.body);
        const requestUserInfo = userInfoInReq(req);
        const updated = await this.tasksService.updateOne(requestUserInfo, id, validUpdate);
        res.status(statusCodes.OK).json(updated);
    };
}
