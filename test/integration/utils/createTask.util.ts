import request from 'supertest';
import { testKit } from './testKit.util';
import { status2xx } from './status2xx.util';

export const createTask = async (sessionToken: string) => {
    const response = await request(testKit.server)
        .post(testKit.endpoints.createTask)
        .send(testKit.tasksDataGenerator.fullTask())
        .set('Authorization', `Bearer ${sessionToken}`)
        .expect(status2xx);

    return {
        taskName: response.body.name,
        taskDescription: response.body.description,
        taskStatus: response.body.status,
        taskPriority: response.body.priority,
        taskId: response.body.id,
    };
};