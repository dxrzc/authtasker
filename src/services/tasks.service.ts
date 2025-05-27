import { HydratedDocument, Model, Types } from "mongoose";
import { CreateTaskValidator } from "@root/rules/validators/models/tasks/create-task.validator";
import { FORBIDDEN_MESSAGE } from "@root/rules/errors/messages/error.messages";
import { HttpError } from "@root/rules/errors/http.error";
import { ITasks } from "@root/interfaces/tasks/task.interface";
import { LoggerService } from "./logger.service";
import { UpdateTaskValidator } from "@root/rules/validators/models/tasks/update-task.validator";
import { UserRole } from "@root/types/user/user-roles.type";
import { UserService } from "./user.service";

export class TasksService {

    constructor(
        private readonly loggerService: LoggerService,
        private readonly tasksModel: Model<ITasks>,
        private readonly userService: UserService,
    ) {}

    private handlePossibleDuplicatedKeyError(error: any): never {
        if (error.code && error.code === 11000) {
            const duplicatedKey = Object.keys(error.keyValue);
            const keyValue = Object.values(error.keyValue);
            const message = `Task with ${duplicatedKey} "${keyValue}" already exists`;
            this.loggerService.error(message);
            throw HttpError.conflict(message);
        } else {
            // rethrowing        
            throw error;
        }
    }

    private async isModificationAuthorized(requestUserInfo: { id: string, role: UserRole }, taskId: string): Promise<HydratedDocument<ITasks> | null> {
        const task = await this.findOne(taskId);

        const taskCreatorId = task.user.toString();
        const taskCreator = await this.userService.findOne(taskCreatorId);

        let isTaskCreator = (requestUserInfo.id === taskCreatorId);

        if (isTaskCreator) {
            return task;
        } else {
            // administrators can not modify other administrators tasks
            if (requestUserInfo.role === 'admin') {
                return (taskCreator.role === 'admin') ? null : task;
            }
        }

        return null;
    }

    async create(task: CreateTaskValidator, user: string): Promise<HydratedDocument<ITasks>> {
        try {
            const taskCreated = await this.tasksModel.create({
                ...task,
                user,
            });

            this.loggerService.info(`Task ${taskCreated.id} created`);
            return taskCreated;

        } catch (error) {
            this.handlePossibleDuplicatedKeyError(error);
        }
    }

    async findOne(id: string): Promise<HydratedDocument<ITasks>> {
        let taskFound;

        if (Types.ObjectId.isValid(id)) {
            taskFound = await this.tasksModel
                .findById(id)
                .exec();
        }

        // id is not valid / task not found
        if (!taskFound) {
            const error = `Task with id ${id} not found`;
            this.loggerService.error(error)
            throw HttpError.notFound(error);
        }

        return taskFound;
    }

    async findAll(limit: number, page: number): Promise<HydratedDocument<ITasks>[]> {
        if (limit <= 0) {
            throw HttpError.badRequest('Limit must be a valid number');
        }

        if (limit > 100) {
            throw HttpError.badRequest('Limit is too large');
        }

        const totalDocuments = await this.tasksModel
            .countDocuments()
            .exec();

        if (totalDocuments === 0) {
            return [];
        }

        const totalPages = Math.ceil(totalDocuments / limit);

        if (page <= 0) {
            throw HttpError.badRequest('Page must be a valid number');
        }

        if (page > totalPages) {
            throw HttpError.badRequest('Invalid page');
        }

        const offset = (page - 1) * limit;

        return await this.tasksModel
            .find()
            .skip(offset)
            .limit(limit)
            .exec();
    }

    async findAllByUser(userId: string) {
        const userExists = await this.userService.findOne(userId);

        const tasks = await this.tasksModel
            .find({ user: userId })
            .exec();

        return tasks;
    }

    async deleteOne(requestUserInfo: { id: string, role: UserRole }, id: string): Promise<void> {
        const task = await this.isModificationAuthorized(requestUserInfo, id);

        if (!task) {
            this.loggerService.error(`Not authorized to perform this action`);
            throw HttpError.forbidden(FORBIDDEN_MESSAGE);
        }

        await task.deleteOne().exec();
        this.loggerService.info(`Task ${id} deleted`);
    }

    async updateOne(requestUserInfo: { id: string, role: UserRole }, id: string, task: UpdateTaskValidator): Promise<HydratedDocument<ITasks>> {
        try {
            const taskToUpdate = await this.isModificationAuthorized(requestUserInfo, id);

            if (!taskToUpdate) {
                this.loggerService.error(`Not authorized to perform this action`);
                throw HttpError.forbidden(FORBIDDEN_MESSAGE);
            }

            Object.assign(taskToUpdate, task);
            await taskToUpdate.save();

            this.loggerService.info(`Task ${id} updated`);
            return taskToUpdate;

        } catch (error) {
            this.handlePossibleDuplicatedKeyError(error);
        }
    }
}