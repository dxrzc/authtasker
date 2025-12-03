import { Model } from 'mongoose';
import { ITasks } from 'src/interfaces/tasks/task.interface';
import { IUser } from 'src/interfaces/user/user.interface';

export type Models = {
    userModel: Model<IUser>;
    tasksModel: Model<ITasks>;
};
