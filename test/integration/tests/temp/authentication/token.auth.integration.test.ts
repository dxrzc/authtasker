import request from 'supertest';

// Test the following routes are protected by authentication based on bearer token

const protectedRoutes = [
    { method: 'delete', url: '/api/users/' },
    { method: 'patch', url: '/api/users/' },
];

describe('Auth Middleware Wiring', () => {
    // TODO: 
});