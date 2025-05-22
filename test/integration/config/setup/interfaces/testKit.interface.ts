import { ITasks, IUser } from '@root/interfaces';
import { TasksDataGenerator, UserDataGenerator } from '@root/seed/generators';
import { HashingService } from '@root/services';
import { Express } from 'express';
import { Model } from 'mongoose';

export interface ITestKit {
    userModel: Model<IUser>;
    tasksModel: Model<ITasks>;

    userDataGenerator: UserDataGenerator;
    tasksDataGenerator: TasksDataGenerator;

    server: Express;

    hashingService: HashingService;

    endpoints: {
        usersAPI: string;
        register: string;
        login: string;
        requestEmailValidation: string;

        tasksAPI: string;
        createTask: string;        
    };
};