import { ITestKit } from '@integration/interfaces/test-kit.interface';

export const testKit: ITestKit = {
    urls: {
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
        resetPassword: `/api/users/reset-password`,
        tasksAPI: '/api/tasks',
        createTask: `/api/tasks/create`,
        findAllTasksByUser: '/api/tasks/allByUser',
        refreshToken: '/api/users/refresh-token',
        health: '/health',
    },
} as any;
