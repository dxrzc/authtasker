import { TasksPriority } from './task-priority.type';
import { TasksStatus } from './task-status.type';

export type TasksFilters = Readonly<{
    readonly userId?: string;
    readonly status?: TasksStatus;
    readonly priority?: TasksPriority;
}>;
