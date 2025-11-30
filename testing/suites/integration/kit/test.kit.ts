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
        logoutAll: '/api/users/logout-from-all-sessions',
        requestEmailValidation: `/api/users/request-email-validation`,
        confirmEmailValidation: `/api/users/confirm-email-validation`,
        forgotPassword: `/api/users/forgot-password`,
        resetPassword: `/api/users/reset-password`,
        tasksAPI: '/api/tasks',
        createTask: `/api/tasks/create`,
        findAllTasksByUser: '/api/tasks/all-by-user',
        findAllTasksByStatus: '/api/tasks/all-by-status',
        findAllTasksByPriority: '/api/tasks/all-by-priority',
        refreshToken: '/api/users/refresh-token',
        health: '/health',
    },
} as any;
