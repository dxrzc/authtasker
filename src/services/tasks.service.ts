import { HydratedDocument, Model, Types } from "mongoose";
import { CreateTaskValidator } from "@root/rules/validators/models/tasks/create-task.validator";
import { FORBIDDEN_MESSAGE } from "@root/rules/errors/messages/error.messages";
import { HttpError } from "@root/rules/errors/http.error";
import { ITasks } from "@root/interfaces/tasks/task.interface";
import { LoggerService } from "./logger.service";
import { UpdateTaskValidator } from "@root/rules/validators/models/tasks/update-task.validator";
import { UserRole } from "@root/types/user/user-roles.type";
import { UserService } from "./user.service";
import { handleDbDuplicatedKeyError } from "@logic/errors/database";
import { paginationRules } from "@logic/others";

export class TasksService {

    constructor(
        private readonly loggerService: LoggerService,
        private readonly tasksModel: Model<ITasks>,
        private readonly userService: UserService,
    ) {}

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
                handleDbDuplicatedKeyError(error, this.loggerService);
            throw error;
        }
    }

    async findOne(id: string): Promise<HydratedDocument<ITasks>> {
        let taskFound;
        if (Types.ObjectId.isValid(id))
            taskFound = await this.tasksModel.findById(id).exec();
        // id is not valid / task not found
        if (!taskFound) {
            const error = `Task with id ${id} not found`;
            this.loggerService.error(error)
            throw HttpError.notFound(error);
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
            throw HttpError.forbidden(FORBIDDEN_MESSAGE);
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
                throw HttpError.forbidden(FORBIDDEN_MESSAGE);
            }
            // set new properties in document
            Object.assign(taskToUpdate, task);
            await taskToUpdate.save();
            this.loggerService.info(`Task ${id} updated`);
            return taskToUpdate;

        } catch (error: any) {
            if (error.code === 11000)
                handleDbDuplicatedKeyError(error, this.loggerService);
            throw error;
        }
    }
}