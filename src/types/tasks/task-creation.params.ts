import { ITasks } from 'src/interfaces/tasks/task.interface';

export type TaskCreationParams = Omit<ITasks, 'id' | 'createdAt' | 'updatedAt' | 'user'>;
