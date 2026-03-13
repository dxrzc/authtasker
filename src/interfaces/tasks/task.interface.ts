import { TasksStatus } from 'src/types/tasks/task-status.type';
import { TasksPriority } from 'src/types/tasks/task-priority.type';

export interface ITasks {
    id: string;
    name: string;
    description: string;
    status: TasksStatus;
    priority: TasksPriority;
    user: string;
    createdAt: Date;
    updatedAt: Date;
}
