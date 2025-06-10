import { ITasks, IUser } from '@root/interfaces';
import { TasksDataGenerator, UserDataGenerator } from '@root/seed/generators';
import { HashingService, JwtService, RedisService } from '@root/services';
import { Express } from 'express';
import { Model } from 'mongoose';

export interface ITestKit {
    
    userModel: Model<IUser>;
    tasksModel: Model<ITasks>;
    
    userDataGenerator: UserDataGenerator;
    tasksDataGenerator: TasksDataGenerator;
    
    server: Express;
    
    jwtService: JwtService;
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