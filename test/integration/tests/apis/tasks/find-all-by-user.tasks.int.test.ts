import request from 'supertest';
import { createUser, status2xx, testKit } from "@integration/utils";
import { createTask } from "@integration/utils/createTask.util";

describe('GET /api/tasks/allByUser/:id', () => {
    describe('Response', () => {
        test.concurrent('return status 200 OK and all the tasks created by the user in ascending order (based on createdAt)', async () => {
            const expectedStatus = 200;
            const { userId, sessionToken } = await createUser('editor');

            // Create 6 tasks sequentially
            let tasksId = new Array<string>();
            for (let i = 0; i < 6; i++) {
                const { taskId } = await createTask(sessionToken);
                tasksId.push(taskId);
            }            

            // Get tasks full data
            let tasksFullData = new Array();
            for (const id of tasksId) {
                const taskInDb = await testKit.tasksModel.findById(id);
                tasksFullData.push({
                    name: taskInDb!.name,
                    description: taskInDb!.description,
                    status: taskInDb!.status,
                    priority: taskInDb!.priority,
                    user: taskInDb!.user.toString(),
                    createdAt: taskInDb!.createdAt.toISOString(),
                    updatedAt: taskInDb!.updatedAt.toISOString(),
                    id: taskInDb!.id,
                });
            }

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`);

            expect(response.statusCode).toBe(expectedStatus);            
            expect(response.body).toStrictEqual(tasksFullData);
        });

        test.concurrent('return empty array when user does not have any task', async () => {
            const { userId } = await createUser('readonly');
            const { sessionToken } = await createUser('readonly');

            const response = await request(testKit.server)
                .get(`${testKit.endpoints.findAllTasksByUser}/${userId}`)
                .set('Authorization', `Bearer ${sessionToken}`)
                .expect(status2xx);

            expect(response.body).toStrictEqual([]);
        });
    });
});