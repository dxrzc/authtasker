import { IUser } from "@root/interfaces/user/user.interface";
import { Server } from "@root/server/server.init";
import { ConfigService } from "@root/services/config.service";
import { Model } from "mongoose";
import {Express} from 'express';
import { UserDataGenerator } from "@root/seed/generators/user.generator";
import { HashingService } from "@root/services";
import { TasksDataGenerator } from "@root/seed/generators/tasks.generator";
import { ITasks } from "@root/interfaces/tasks/task.interface";

declare global {
    var USER_MODEL: Model<IUser>;
    var TASKS_MODEL: Model<ITasks>
    var SERVER_APP: Express;
    var USER_DATA_GENERATOR: UserDataGenerator;    
    var TASKS_DATA_GENERATOR: TasksDataGenerator;
    var CONFIG_SERVICE: ConfigService;
    var HASHING_SERVICE: HashingService;
}

export global {};