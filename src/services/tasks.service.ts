import { HydratedDocument, Model, Types } from "mongoose";
import { CreateTaskValidator, UpdateTaskValidator } from '@root/validators/models/tasks';
import { authErrors, tasksApiErrors } from '@root/common/errors/messages';
import { HttpError } from "@root/common/errors/classes/http-error.class";
import { ITasks } from "@root/interfaces/tasks/task.interface";
import { UserRole } from "@root/types/user/user-roles.type";
import { LoggerService } from "./logger.service";
import { paginationRules } from "@logic/others";
import { UserService } from "./user.service";

export class TasksService {

    constructor(
        private readonly loggerService: LoggerService,
        private readonly tasksModel: Model<ITasks>,
        private readonly userService: UserService,
    ) {}

    private handleDbDuplicatedKeyError(error: any): never {
        const duplicatedKey = Object.keys(error.keyValue);
        const keyValue = Object.values(error.keyValue);
        this.loggerService.error(`Task with ${duplicatedKey}: "${keyValue}" already exists`);
        throw HttpError.conflict(tasksApiErrors.taskAlreadyExists(duplicatedKey[0]));
    }

    private async getTaskIfUserAuthorizedToModify(requestUserInfo: { id: string, role: UserRole }, taskId: string): Promise<HydratedDocument<ITasks> | null> {
        const task = await this.findOne(taskId);
        // find task owner
        const taskOwner = await this.userService.findOne(task.user.toString());
        // administrators can not modify other administrators tasks
        if (requestUserInfo.role === 'admin' && taskOwner.role !== 'admin')
            return task;
        // users can modify their own tasks
        if (requestUserInfo.id === taskOwner.id)
            return task;
        return null;
    }

    async create(task: CreateTaskValidator, user: string): Promise<HydratedDocument<ITasks>> {
        try {
            const taskCreated = await this.tasksModel.create({ ...task, user });
            this.loggerService.info(`Task ${taskCreated.id} created`);
            return taskCreated;

        } catch (error: any) {
            if (error.code === 11000)
                this.handleDbDuplicatedKeyError(error);
            throw error;
        }
    }

    async findOne(id: string): Promise<HydratedDocument<ITasks>> {
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

    async findAll(limit: number, page: number): Promise<HydratedDocument<ITasks>[]> {
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
        await this.userService.findOne(userId);
        const tasks = await this.tasksModel
            .find({ user: userId })
            .sort({ createdAt: 1 })
            .exec();
        return tasks;
    }

    async deleteOne(requestUserInfo: { id: string, role: UserRole }, id: string): Promise<void> {
        // check if current user is authorized
        const task = await this.getTaskIfUserAuthorizedToModify(requestUserInfo, id);
        if (!task) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(authErrors.FORBIDDEN);
        }
        await task.deleteOne().exec();
        this.loggerService.info(`Task ${id} deleted`);
    }

    async updateOne(requestUserInfo: { id: string, role: UserRole }, id: string, task: UpdateTaskValidator): Promise<HydratedDocument<ITasks>> {
        try {
            // check if current user is authorized
            const taskToUpdate = await this.getTaskIfUserAuthorizedToModify(requestUserInfo, id);
            if (!taskToUpdate) {
                this.loggerService.error(`Not authorized to perform this action`);
                throw HttpError.forbidden(authErrors.FORBIDDEN);
            }
            // set new properties in document
            Object.assign(taskToUpdate, task);
            await taskToUpdate.save();
            this.loggerService.info(`Task ${id} updated`);
            return taskToUpdate;

        } catch (error: any) {
            if (error.code === 11000)
                this.handleDbDuplicatedKeyError(error);
            throw error;
        }
    }
}