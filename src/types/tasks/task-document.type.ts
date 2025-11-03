import { HydratedDocument } from 'mongoose';
import { ITasks } from 'src/interfaces/tasks/task.interface';

export type TaskDocument = HydratedDocument<ITasks>;