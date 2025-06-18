import { Express } from 'express';
import { Model } from 'mongoose';
import { JwtService } from '@root/services/jwt.service';
import { RedisService } from '@root/services/redis.service';
import { IUser } from '@root/interfaces/user/user.interface';
import { ITasks } from '@root/interfaces/tasks/task.interface';
import { HashingService } from '@root/services/hashing.service';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';
import { UserDataGenerator } from '@root/seed/generators/user.generator';
import { JwtBlackListService } from '@root/services/jwt-blacklist.service';

export interface ITestKit {
    
    userModel: Model<IUser>;
    tasksModel: Model<ITasks>;
    
    userDataGenerator: UserDataGenerator;
    tasksDataGenerator: TasksDataGenerator;
    
    server: Express;
    
    jwtService: JwtService;
    jwtBlacklistService: JwtBlackListService;
    hashingService: HashingService;
    // redisService: RedisService;

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