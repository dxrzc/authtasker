import { Model } from 'mongoose';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { Repository } from './repository';
import { TaskCreationParams } from 'src/types/tasks/task-creation.params';
import { TaskDocument } from 'src/types/tasks/task-document.type';

export class TaskRepository extends Repository<ITasks> {
    constructor(private readonly taskModel: Model<ITasks>) {
        super(taskModel);
    }

    async create(task: TaskCreationParams & { user: string }): Promise<TaskDocument> {
        return await this.taskModel.create(task);
    }
}
