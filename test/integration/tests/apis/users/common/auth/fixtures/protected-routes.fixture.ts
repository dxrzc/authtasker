import { testKit } from '@integration/utils';

export const usersApiProtectedRoutes = [
    // requestEmailValidation
    {
        method: 'post',
        url: testKit.endpoints.requestEmailValidation
    },

    // logout
    {
        method: 'post',
        url: testKit.endpoints.logout
    },

    // deleteOne
    {
        method: 'delete',
        url: `${testKit.endpoints.usersAPI}/123`
    },

    // updateOne
    {
        method: 'patch',
        url: `${testKit.endpoints.usersAPI}/123`
    },

    // findById
    {
        method: 'get',
        url: `${testKit.endpoints.usersAPI}/123`
    },

    // findAll
    {
        method: 'get',
        url: testKit.endpoints.usersAPI
    },

] as const;