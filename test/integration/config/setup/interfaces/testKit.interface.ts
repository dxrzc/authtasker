import { ITasks, IUser } from '@root/interfaces';
import { TasksDataGenerator, UserDataGenerator } from '@root/seed/generators';
import { HashingService, RedisService } from '@root/services';
import { Express } from 'express';
import { Model } from 'mongoose';

export interface ITestKit {
    jwtPrivateKey: string;

    userModel: Model<IUser>;
    tasksModel: Model<ITasks>;

    userDataGenerator: UserDataGenerator;
    tasksDataGenerator: TasksDataGenerator;

    server: Express;

    hashingService: HashingService;
    redisService: RedisService;

    endpoints: {
        usersAPI: string;
        register: string;
        login: string;
        logout: string;
        requestEmailValidation: string;
        confirmEmailValidation: string;

        tasksAPI: string;
        createTask: string;  
        findAllTasksByUser: string;      
    };
};