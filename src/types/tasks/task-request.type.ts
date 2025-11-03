import { ITasks } from 'src/interfaces/tasks/task.interface';

/* Represents the data expected in request. Used in validation classes
Use with "Exact" type to get and immediately type error on files that work
with the request if one property is added or removed */
export type TaskRequest = Omit<ITasks, 'id' | 'createdAt' | 'updatedAt' | 'user'>;
