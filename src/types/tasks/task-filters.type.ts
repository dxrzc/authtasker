import { TasksPriority } from './task-priority.type';
import { TasksStatus } from './task-status.type';

export type TasksFilters = {
    userId?: string;
    status?: TasksStatus;
    priority?: TasksPriority;
};
