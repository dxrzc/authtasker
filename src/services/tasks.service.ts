import { Apis } from 'src/enums/apis.enum';
import { UserService } from 'src/services/user.service';
import { Model, Types } from 'mongoose';
import { CacheService } from './cache.service';
import { LoggerService } from 'src/services/logger.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { calculatePagination } from 'src/functions/pagination/calculate-pagination';
import { TaskResponse } from 'src/types/tasks/task-response.type';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { HttpError } from 'src/errors/http-error.class';
import { UserIdentity } from 'src/interfaces/user/user-identity.interface';
import { authErrors } from 'src/messages/auth.error.messages';
import { handleDuplicatedKeyInDb } from 'src/functions/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from 'src/functions/roles/modification-access-control';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from 'src/validators/models/tasks/update-task.validator';
import { IFindOptions } from 'src/interfaces/others/find-options.interface';
import { IPagination } from 'src/interfaces/pagination/pagination.interface';
import { TasksStatus } from 'src/types/tasks/task-status.type';

export class TasksService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly tasksModel: Model<ITasks>,
        private readonly userService: UserService,
        private readonly cacheService: CacheService<TaskDocument>,
    ) {}

    private async findTaskInDb(id: string): Promise<TaskDocument> {
        const taskFound = await this.tasksModel.findById(id).exec();
        // id is not valid / task not found
        if (!taskFound) {
            this.loggerService.error(`Task with id ${id} not found`);
            throw HttpError.notFound(tasksApiErrors.NOT_FOUND);
        }
        return taskFound;
    }

    private async authorizeTaskModification(
        requestUserInfo: UserIdentity,
        targetTaskId: string,
    ): Promise<TaskDocument> {
        const task = (await this.findOne(targetTaskId, { cache: false })) as TaskDocument;
        const taskOwner = await this.userService.findOne(task.user.toString(), { cache: false });
        const isCurrentUserAuthorized = modificationAccessControl(requestUserInfo, {
            role: taskOwner.role,
            id: taskOwner.id,
        });
        if (!isCurrentUserAuthorized) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        return task;
    }

    async create(task: CreateTaskValidator, user: string): Promise<TaskDocument> {
        try {
            const taskCreated = await this.tasksModel.create({ ...task, user });
            this.loggerService.info(`Task ${taskCreated.id} created`);
            return taskCreated;
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.tasks, error, this.loggerService);
            throw error;
        }
    }

    async findOne(id: string, options: IFindOptions): Promise<TaskDocument | TaskResponse> {
        // validate id
        const validMongoId = Types.ObjectId.isValid(id);
        if (!validMongoId) {
            this.loggerService.error(`Invalid mongo id`);
            throw HttpError.notFound(tasksApiErrors.NOT_FOUND);
        }
        if (!options.cache) {
            const taskInDb = await this.tasksModel.findById(id).exec();
            if (!taskInDb) {
                this.loggerService.error(`Task ${id} not found`);
                throw HttpError.notFound(tasksApiErrors.NOT_FOUND);
            }
            return taskInDb;
        }
        // check if user is cached
        const taskInCache = await this.cacheService.get(id);
        if (taskInCache) return taskInCache;
        // user is not in cache
        const taskFound = await this.findTaskInDb(id);
        await this.cacheService.cache(taskFound);
        return taskFound;
    }

    async findAll(limit: number, page: number): Promise<IPagination<TaskDocument>> {
        // validate limit and page
        const totalDocuments = await this.tasksModel.countDocuments().exec();
        const { offset, totalPages } = calculatePagination(limit, page, totalDocuments);
        const data = await this.cacheService.getPagination(offset, limit);
        return {
            currentPage: page,
            totalDocuments,
            totalPages,
            data,
        };
    }

    async findAllByUser(
        userId: string,
        limit: number,
        page: number,
    ): Promise<IPagination<TaskDocument>> {
        // verifies that user exists or throws
        await this.userService.findOne(userId, { cache: false });
        const totalDocuments = await this.tasksModel.find({ user: userId }).countDocuments().exec();
        const { offset, totalPages } = calculatePagination(limit, page, totalDocuments);
        const data = await this.cacheService.getPagination(offset, limit, {
            find: { user: userId },
        });
        return {
            currentPage: page,
            totalDocuments,
            totalPages,
            data,
        };
    }

    async findAllByStatus(
        status: TasksStatus,
        limit: number,
        page: number,
    ): Promise<IPagination<TaskDocument>> {
        const totalDocuments = await this.tasksModel.countDocuments({ status }).exec();
        const { offset, totalPages } = calculatePagination(limit, page, totalDocuments);
        const data = await this.cacheService.getPagination(offset, limit, {
            find: { status },
        });
        return {
            currentPage: page,
            totalDocuments,
            totalPages,
            data,
        };
    }

    async deleteOne(requestUserInfo: UserIdentity, taskId: string): Promise<void> {
        const targetTask = await this.authorizeTaskModification(requestUserInfo, taskId);
        await targetTask.deleteOne().exec();
        this.loggerService.info(`Task ${taskId} deleted`);
    }

    async updateOne(
        requestUserInfo: UserIdentity,
        targetTaskId: string,
        task: UpdateTaskValidator,
    ): Promise<TaskDocument> {
        const targetTask = await this.authorizeTaskModification(requestUserInfo, targetTaskId);
        // set new properties in document
        Object.assign(targetTask, task);
        try {
            await targetTask.save();
            this.loggerService.info(`Task ${targetTaskId} updated`);
            return targetTask;
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.tasks, error, this.loggerService);
            throw error;
        }
    }
}
