import { faker } from '@faker-js/faker';
import { testKit } from '@integration/kit/test.kit';
import { TaskDocument } from 'src/types/tasks/task-document.type';

export async function createTasksForUser(userId: string, nTasks: number): Promise<TaskDocument[]> {
    const taskPromises = new Array<Promise<TaskDocument>>();
    for (let i = 0; i < nTasks; i++) {
        taskPromises.push(
            testKit.models.task.create({
                ...testKit.taskData.task,
                user: userId,
                createdAt: faker.date.anytime(),
            }),
        );
    }
    return await Promise.all(taskPromises);
}
