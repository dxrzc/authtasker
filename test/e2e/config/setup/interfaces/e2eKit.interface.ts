import { Axios } from 'axios';
import { ConfigService } from '@root/services/config.service';
import { UserDataGenerator } from '@root/seed/generators/user.generator';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';

export interface IE2EKit {
    configService: ConfigService,
    userDataGenerator: UserDataGenerator,
    tasksDataGenerator: TasksDataGenerator,
    client: Axios,
    adminSessionToken: string;
    endpoints: {
        usersAPI: string;
        myProfile: string;
        register: string;
        login: string;
        logout: string;
        requestEmailValidation: string;
        confirmEmailValidation: string;
        tasksAPI: string;
        createTask: string;
        findAllTasksByUser: string;
        refreshToken: string;
        health: string;
    }
}