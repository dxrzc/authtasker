import { ITestKit } from '@integration/config/setup/interfaces/testKit.interface';

export const testKit: ITestKit = {
    endpoints: {
        seedUsers: '/seed/users',
        seedTasks: '/seed/tasks',
        usersAPI: '/api/users',
        myProfile: '/api/users/me',
        register: `/api/users/register`,
        login: `/api/users/login`,
        logout: `/api/users/logout`,
        logoutFromAll: '/api/users/logoutFromAll',
        requestEmailValidation: `/api/users/requestEmailValidation`,
        confirmEmailValidation: `/api/users/confirmEmailValidation`,
        forgotPassword: `/api/users/forgot-password`,
        tasksAPI: '/api/tasks',
        createTask: `/api/tasks/create`,
        findAllTasksByUser: '/api/tasks/allByUser',
        refreshToken: '/api/users/refresh-token',
        health: '/health'
    }
} as any;