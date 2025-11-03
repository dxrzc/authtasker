import { Axios } from 'axios';
import { ConfigService } from 'src/services/config.service';
import { UserDataGenerator } from 'src/seed/generators/user.generator';
import { TasksDataGenerator } from 'src/seed/generators/tasks.generator';
import { ImapFlow } from 'imapflow';

export interface IE2EKit {
    configService: ConfigService,
    userDataGenerator: UserDataGenerator,
    tasksDataGenerator: TasksDataGenerator,
    client: Axios,
    emailClient: ImapFlow;
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