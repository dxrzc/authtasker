import { HydratedDocument } from 'mongoose';
import { ITasks } from '@root/interfaces/tasks/task.interface';

export type TaskDocument = HydratedDocument<ITasks>;