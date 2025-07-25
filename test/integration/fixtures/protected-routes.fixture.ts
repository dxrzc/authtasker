import { testKit } from '@integration/utils/testKit.util';

export const protectedRoutes = [
    // Users API
    { method: 'post', url: testKit.endpoints.requestEmailValidation },
    { method: 'post', url: testKit.endpoints.logout },    
    { method: 'delete', url: `${testKit.endpoints.usersAPI}/123` },
    { method: 'patch', url: `${testKit.endpoints.usersAPI}/123` },
    { method: 'get', url: `${testKit.endpoints.usersAPI}/123` },
    { method: 'get', url: testKit.endpoints.usersAPI },
    { method: 'get', url: testKit.endpoints.myProfile },

    // Tasks API
    { method: 'post', url: testKit.endpoints.createTask, },
    { method: 'delete', url: `${testKit.endpoints.usersAPI}/123`, },
    { method: 'get', url: `${testKit.endpoints.tasksAPI}/123`, },
    { method: 'get', url: testKit.endpoints.tasksAPI, },
    { method: 'get', url: `${testKit.endpoints.findAllTasksByUser}/123`, },
    { method: 'patch', url: `${testKit.endpoints.tasksAPI}/123`, },

    //others
    { method: 'get', url: testKit.endpoints.health }
] as const;