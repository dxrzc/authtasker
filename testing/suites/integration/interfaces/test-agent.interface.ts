import { Test } from 'supertest';

// Ensures methods (e.g .post(...)) are called before anything else on the agent
// Example: agent.post('/url').send({...}).
type HttpMethod = 'get' | 'post' | 'put' | 'delete' | 'patch';
export type TestAgent = {
    [M in HttpMethod]: (url: string) => Test;
};
