import { Request, Response } from 'express';
import { TasksService } from 'src/services/tasks.service';
import { statusCodes } from 'src/constants/status-codes.constants';
import { paginationSettings } from 'src/constants/pagination.constants';
import { CreateTaskDto } from 'src/validators/models/tasks/create-task.dto';
import { UpdateTaskDto } from 'src/validators/models/tasks/update-task.dto';
import { TaskStatusDto } from 'src/validators/models/tasks/task-status.dto';
import { TaskPriorityDto } from 'src/validators/models/tasks/task-priority.dto';
import { userInfoInReq } from 'src/functions/express/user-info-in-req';

export class TasksController {
    constructor(private readonly tasksService: TasksService) {}

    public readonly create = async (req: Request, res: Response) => {
        const validTask = await CreateTaskDto.validateAndTransform(req.body);
        const requestUserInfo = userInfoInReq(req);
        const created = await this.tasksService.create(validTask, requestUserInfo.id);
        res.status(statusCodes.CREATED).json(created);
    };

    public readonly findOne = async (req: Request, res: Response) => {
        const id = req.params.id;
        const taskFound = await this.tasksService.findOne(id, { cache: true });
        res.status(statusCodes.OK).json(taskFound);
    };

    public readonly findAll = async (req: Request, res: Response) => {
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const tasksFound = await this.tasksService.findAll(limit, page);
        res.status(statusCodes.OK).json(tasksFound);
    };

    public readonly findAllByUser = async (req: Request, res: Response) => {
        const userId = req.params.id;
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const tasksFound = await this.tasksService.findAllByUser(userId, limit, page);
        res.status(statusCodes.OK).json(tasksFound);
    };

    public readonly findAllByStatus = async (req: Request, res: Response) => {
        const status = TaskStatusDto.validateStatus(req.params.status);
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const tasksFound = await this.tasksService.findAllByStatus(status, limit, page);
        res.status(statusCodes.OK).json(tasksFound);
    };

    public readonly findAllByPriority = async (req: Request, res: Response) => {
        const priority = TaskPriorityDto.validatePriority(req.params.priority);
        const limit = req.query.limit ? +req.query.limit : paginationSettings.DEFAULT_LIMIT;
        const page = req.query.page ? +req.query.page : paginationSettings.DEFAULT_PAGE;
        const tasksFound = await this.tasksService.findAllByPriority(priority, limit, page);
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
        const validUpdate = await UpdateTaskDto.validateNewAndTransform(req.body);
        const requestUserInfo = userInfoInReq(req);
        const updated = await this.tasksService.updateOne(requestUserInfo, id, validUpdate);
        res.status(statusCodes.OK).json(updated);
    };
}
