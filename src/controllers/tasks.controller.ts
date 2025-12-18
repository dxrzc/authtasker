import { Request, Response } from 'express';
import { TasksService } from 'src/services/tasks.service';
import { statusCodes } from 'src/constants/status-codes.constants';
import { paginationSettings } from 'src/constants/pagination.constants';
import { CreateTaskDto } from 'src/dtos/models/tasks/create-task.dto';
import { UpdateTaskDto } from 'src/dtos/models/tasks/update-task.dto';
import { TaskStatusDto } from 'src/dtos/models/tasks/task-status.dto';
import { TaskPriorityDto } from 'src/dtos/models/tasks/task-priority.dto';
import { userInfoInReq } from 'src/functions/express/user-info-in-req';
import { TasksFilters } from 'src/types/tasks/task-filters.type';

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
        const rawStatus = req.query.status;
        const rawPriority = req.query.priority;
        const rawUserId = req.query.user;
        const filters: TasksFilters = {};
        if (rawStatus) {
            const { status } = await TaskStatusDto.validate({ status: rawStatus });
            filters.status = status;
        }
        if (rawPriority) {
            const { priority } = await TaskPriorityDto.validate({ priority: rawPriority });
            filters.priority = priority;
        }
        if (rawUserId) {
            filters.userId = <string>rawUserId;
        }
        const tasksFound = await this.tasksService.findAll(limit, page, filters);
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
