import { testKit } from '@integration/utils';

export const tasksApiProtectedRoutes = [
    // createOne
    {
        method: 'post',
        url: testKit.endpoints.createTask,
        // minRoleRequired: 'editor'
    },

    // deleteOne
    {
        method: 'delete',
        url: `${testKit.endpoints.usersAPI}/123`,
        // minRoleRequired: 'editor'
    },

    // findById
    {
        method: 'get',
        url: `${testKit.endpoints.tasksAPI}/123`,
        // minRoleRequired: 'readonly'
    },

    // findAll      
    {
        method: 'get',
        url: testKit.endpoints.tasksAPI,
        // minRoleRequired: 'readonly'
    },

    // findAllByUser
    {
        method: 'get',
        url: `${testKit.endpoints.findAllTasksByUser}/123`,
        // minRoleRequired: 'readonly'
    },

    // updateOne
    {
        method: 'patch',
        url: `${testKit.endpoints.tasksAPI}/123`,
        // minRoleRequired: 'editor'
    },

] as const;