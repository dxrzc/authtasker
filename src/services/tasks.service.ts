import { Apis } from '@root/enums/apis.enum';
import { UserService } from '@root/services/user.service';
import { Model, Types } from "mongoose";
import { CacheService } from './cache.service';
import { LoggerService } from '@root/services/logger.service';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { paginationRules } from '@logic/pagination/pagination-rules';
import { TaskResponse } from '@root/types/tasks/task-response.type';
import { TaskDocument } from '@root/types/tasks/task-document.type';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { UserIdentity } from '@root/interfaces/user/user-indentity.interface';
import { ICacheOptions } from '@root/interfaces/cache/cache-options.interface';
import { authErrors } from '@root/common/errors/messages/auth.error.messages';
import { handleDuplicatedKeyInDb } from '@logic/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from '@logic/roles/modification-access-control';
import { tasksApiErrors } from '@root/common/errors/messages/tasks-api.error.messages';
import { CreateTaskValidator } from '@root/validators/models/tasks/create-task.validator';
import { UpdateTaskValidator } from '@root/validators/models/tasks/update-task.validator';

export class TasksService {

    constructor(
        private readonly loggerService: LoggerService,
        private readonly tasksModel: Model<ITasks>,
        private readonly userService: UserService,
        private readonly cacheService: CacheService<TaskResponse>,
    ) {}

    private async findTaskInDb(id: string): Promise<TaskDocument> {
        const taskFound = await this.tasksModel.findById(id).exec();
        // id is not valid / task not found
        if (!taskFound) {
            this.loggerService.error(`Task with id ${id} not found`)
            throw HttpError.notFound(tasksApiErrors.TASK_NOT_FOUND);
        }
        return taskFound;
    }

    private async authorizeTaskModification(requestUserInfo: UserIdentity, targetTaskId: string): Promise<TaskDocument> {
        const task = await this.findOne(targetTaskId, { noStore: true }) as TaskDocument;
        const taskOwner = await this.userService.findOne(task.user.toString(), { noStore: true });
        const isCurrentUserAuthorized = modificationAccessControl(requestUserInfo, {
            role: taskOwner.role,
            id: taskOwner.id
        });
        if (!isCurrentUserAuthorized) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        return task;
    };

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
            this.loggerService.error(`Invalid mongo id`)
            throw HttpError.notFound(tasksApiErrors.TASK_NOT_FOUND);
        }
        // bypass read-write in cache
        if (options.noStore) {
            this.loggerService.info(`Bypassing cache for task ${id}`);
            return await this.findTaskInDb(id);
        }
        // check if user is cached
        const taskInCache = await this.cacheService.get(id);
        if (taskInCache)
            return taskInCache;
        // user is not in cache
        const taskFound = await this.findTaskInDb(id);
        await this.cacheService.cache(taskFound);
        return taskFound;
    }

    async findAll(limit: number, page: number): Promise<TaskDocument[]> {
        const totalDocuments = await this.tasksModel.countDocuments().exec();
        if (totalDocuments === 0) return [];
        const offset = paginationRules(limit, page, totalDocuments);
        return await this.tasksModel
            .find()
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1 })
            .exec();
    }

    async findAllByUser(userId: string, limit: number, page: number) {
        // verifies that user exists or throws
        await this.userService.findOne(userId, { noStore: true });
        const totalDocuments = await this.tasksModel.findById(userId).countDocuments().exec();
        if (totalDocuments === 0) return [];
        const offset = paginationRules(limit, page, totalDocuments);
        const tasks = await this.tasksModel
            .find({ user: userId })
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1 })
            .exec();
        return tasks;
    }

    async deleteOne(requestUserInfo: UserIdentity, taskId: string): Promise<void> {
        const targetTask = await this.authorizeTaskModification(requestUserInfo, taskId);
        await targetTask.deleteOne().exec();
        this.loggerService.info(`Task ${taskId} deleted`);
    }

    async updateOne(requestUserInfo: UserIdentity, targetTaskId: string, task: UpdateTaskValidator): Promise<TaskDocument> {
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