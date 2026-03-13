import { Apis } from 'src/enums/apis.enum';
import { UserService } from 'src/services/user.service';
import { ClientSession, Types } from 'mongoose';
import { CacheService } from './cache.service';
import { LoggerService } from 'src/services/logger.service';
import { calculatePagination } from 'src/functions/pagination/calculate-pagination';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { HttpError } from 'src/errors/http-error.class';
import { UserIdentity } from 'src/interfaces/user/user-identity.interface';
import { authErrors } from 'src/messages/auth.error.messages';
import { handleDuplicatedKeyInDb } from 'src/functions/errors/handle-duplicated-key-in-db';
import { modificationAccessControl } from 'src/functions/roles/modification-access-control';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { CreateTaskDto } from 'src/dtos/models/tasks/create-task.dto';
import { UpdateTaskDto } from 'src/dtos/models/tasks/update-task.dto';
import { IFindOptions } from 'src/interfaces/others/find-options.interface';
import { IPagination } from 'src/interfaces/pagination/pagination.interface';
import { PaginationService } from './pagination.service';
import { TaskRepository } from 'src/repositories/task.repository';
import { TasksFilters } from 'src/types/tasks/task-filters.type';

export class TasksService {
    constructor(
        private readonly loggerService: LoggerService,
        private readonly taskRepo: TaskRepository,
        private readonly getUserService: () => UserService, // to avoid circular dependency
        private readonly cacheService: CacheService<TaskDocument>,
        private readonly paginationService: PaginationService<TaskDocument>,
    ) {}

    private get userService(): UserService {
        return this.getUserService();
    }

    private async findTaskInDb(id: string): Promise<TaskDocument> {
        const taskFound = await this.taskRepo.findById(id);
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
        const task = await this.findOne(targetTaskId, { cache: false });
        const taskOwner = await this.userService.findOne(task.user.toString(), {
            cache: false,
        });
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

    async create(task: CreateTaskDto, user: string): Promise<TaskDocument> {
        try {
            const taskCreated = await this.taskRepo.create({ ...task, user });
            this.loggerService.info(`Task ${taskCreated.id} created`);
            return taskCreated;
        } catch (error: any) {
            if (error.code === 11000)
                handleDuplicatedKeyInDb(Apis.tasks, error, this.loggerService);
            throw error;
        }
    }

    async findOne(id: string, options: IFindOptions): Promise<TaskDocument> {
        // validate id
        const validMongoId = Types.ObjectId.isValid(id);
        if (!validMongoId) {
            this.loggerService.error(`Invalid mongo id`);
            throw HttpError.notFound(tasksApiErrors.NOT_FOUND);
        }
        if (!options.cache) {
            const taskInDb = await this.taskRepo.findById(id);
            if (!taskInDb) {
                this.loggerService.error(`Task ${id} not found`);
                throw HttpError.notFound(tasksApiErrors.NOT_FOUND);
            }
            return taskInDb;
        }
        // check if task is cached
        const taskInCache = await this.cacheService.get(id);
        if (taskInCache) return taskInCache;
        // task is not in cache
        const taskFound = await this.findTaskInDb(id);
        await this.cacheService.cache(taskFound);
        return taskFound;
    }

    async findAll(
        limit: number,
        page: number,
        filters?: TasksFilters,
    ): Promise<IPagination<TaskDocument>> {
        if (filters?.user) await this.userService.exists(filters.user);
        const totalDocuments = await this.taskRepo.countDocuments(filters);
        const { offset, totalPages } = calculatePagination(limit, page, totalDocuments);
        const data = await this.paginationService.get(offset, limit, filters);
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
        task: UpdateTaskDto,
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

    async deleteUserTasksTx(userId: string, session: ClientSession): Promise<number> {
        return await this.taskRepo.deleteUserTasksWithTx(userId, session);
    }
}
