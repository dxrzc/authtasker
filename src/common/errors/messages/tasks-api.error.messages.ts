import { tasksLimits } from '@root/common/constants';
import { TaskRequest } from '@root/types/tasks';

export const tasksApiErrors = {
    TASK_NOT_FOUND: 'Task not found',
    TASK_ALREADY_EXISTS: (property: string) => `A task with this ${property} already exists`,
};