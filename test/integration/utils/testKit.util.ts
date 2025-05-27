import { ITestKit } from '../config/setup/interfaces/testKit.interface';

export const testKit: ITestKit = {
    endpoints: {
        usersAPI: '/api/users',
        register: `/api/users/register`,
        login: `/api/users/login`,
        requestEmailValidation: `/api/users/requestEmailValidation`,
        confirmEmailValidation: `/api/users/confirmEmailValidation`,
        tasksAPI: '/api/tasks',
        createTask: `/api/tasks/create`,
    }
} as any;