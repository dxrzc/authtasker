import { Apis } from 'src/enums/apis.enum';
import { UserService } from 'src/services/user.service';
import { Model, Types } from 'mongoose';
import { CacheService } from './cache.service';
import { LoggerService } from 'src/services/logger.service';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { paginationRules } from 'src/functions/pagination/pagination-rules';
import { TaskResponse } from 'src/types/tasks/task-response.type';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { HttpError } from 'src/errors/http-error.class';
import { UserIdentity } from 'src/interfaces/user/user-indentity.interface';
import { ICacheOptions } from 'src/interfaces/cache/cache-options.interface';
import { authErrors } from 'src/messages/auth.error.messages';
import { handleDuplicatedKeyInDb } from 'src/functions/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from 'src/functions/roles/modification-access-control';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from 'src/validators/models/tasks/update-task.validator';
import { PaginationCacheService } from './pagination-cache.service';
import { makeTasksByUserPaginationCacheKey } from 'src/functions/cache/make-tasks-by-users-pag-cache-key';

export class TasksService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly tasksModel: Model<ITasks>,
        private readonly userService: UserService,
        private readonly cacheService: CacheService<TaskResponse>,
        private readonly paginationCache: PaginationCacheService,
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
        const task = (await this.findOne(targetTaskId, { noStore: true })) as TaskDocument;
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

    async findOne(id: string, options: ICacheOptions): Promise<TaskDocument | TaskResponse> {
        // validate id
        const validMongoId = Types.ObjectId.isValid(id);
        if (!validMongoId) {
            this.loggerService.error(`Invalid mongo id`);
            throw HttpError.notFound(tasksApiErrors.NOT_FOUND);
        }
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(`Bypassing cache for task ${id}`);
            return await this.findTaskInDb(id);
        }
        // check if user is cached
        const taskInCache = await this.cacheService.get(id);
        if (taskInCache) return taskInCache;
        // user is not in cache
        const taskFound = await this.findTaskInDb(id);
        await this.cacheService.cache(taskFound);
        return taskFound;
    }

    async findAll(limit: number, page: number, options: ICacheOptions): Promise<TaskDocument[]> {
        // validate limit and page
        const totalDocuments = await this.tasksModel.countDocuments().exec();
        if (totalDocuments === 0) return [];
        const offset = paginationRules(limit, page, totalDocuments);
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(`Bypassing cache for tasks page=${page} limit=${limit}`);
            return await this.tasksModel
                .find()
                .skip(offset)
                .limit(limit)
                .sort({ createdAt: 1 })
                .exec();
        }
        // check if combination of limit and page is cached
        const chunk = await this.paginationCache.get<TaskDocument[]>(Apis.tasks, page, limit);
        if (chunk) return chunk;
        // data is not cached
        const data = await this.tasksModel
            .find()
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1 })
            .exec();
        // cache pagination obtained
        await this.paginationCache.cache(Apis.tasks, page, limit, data);
        return data;
    }

    async findAllByUser(userId: string, limit: number, page: number, options: ICacheOptions) {
        // verifies that user exists or throws
        await this.userService.findOne(userId, { cache: false });
        // validate limit and page
        const totalDocuments = await this.tasksModel.find({ user: userId }).countDocuments().exec();
        if (totalDocuments === 0) return [];
        const offset = paginationRules(limit, page, totalDocuments);
        // mongoose query
        const allByUserQuery = this.tasksModel
            .find({ user: userId })
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1 })
            .exec();
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(
                `Bypassing cache for tasks by user ${userId}, page=${page} limit=${limit}`,
            );
            return await allByUserQuery;
        }
        // check if combination of limit and page is cached
        const cacheKey = makeTasksByUserPaginationCacheKey(userId, page, limit);
        const chunk = await this.paginationCache.getWithKey<TaskDocument[]>(cacheKey);
        if (chunk) return chunk;
        // tasks not cached
        const tasks = await allByUserQuery;
        // cache pagination obtained
        await this.paginationCache.cacheWithKey(cacheKey, tasks);
        return tasks;
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
