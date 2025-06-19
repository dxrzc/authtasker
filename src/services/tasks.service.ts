import { Apis } from '@root/enums/apis.enum';
import { UserService } from '@root/services/user.service';
import { Model, Types } from "mongoose";
import { LoggerService } from '@root/services/logger.service';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { paginationRules } from '@logic/others/pagination-rules';
import { TaskDocument } from '@root/types/tasks/task-document.type';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { UserIdentity } from '@root/interfaces/user/user-indentity.interface';
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
    ) {}

    private async authorizeTaskModification(requestUserInfo: UserIdentity, targetTaskId: string): Promise<TaskDocument> {
        const task = await this.findOne(targetTaskId);
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

    async findOne(id: string): Promise<TaskDocument> {
        let taskFound;
        if (Types.ObjectId.isValid(id))
            taskFound = await this.tasksModel.findById(id).exec();
        // id is not valid / task not found
        if (!taskFound) {
            this.loggerService.error(`Task with id ${id} not found`)
            throw HttpError.notFound(tasksApiErrors.TASK_NOT_FOUND);
        }
        return taskFound;
    }

    async findAll(limit: number, page: number): Promise<TaskDocument[]> {
        const offset = await paginationRules(limit, page, this.tasksModel);
        // no documents found
        if (offset instanceof Array)
            return [];
        return await this.tasksModel
            .find()
            .skip(offset)
            .limit(limit)
            .sort({ createdAt: 1 })
            .exec();
    }

    async findAllByUser(userId: string) {
        // verifies that user exists
        await this.userService.findOne(userId, { noStore: true });
        const tasks = await this.tasksModel
            .find({ user: userId })
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