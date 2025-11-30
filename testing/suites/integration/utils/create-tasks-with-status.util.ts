import { faker } from '@faker-js/faker';
import { testKit } from '@integration/kit/test.kit';
import { TaskDocument } from 'src/types/tasks/task-document.type';
import { TasksStatus } from 'src/types/tasks/task-status.type';

export async function createTasksWithStatus(
    userId: string,
    status: TasksStatus,
    nTasks: number,
): Promise<TaskDocument[]> {
    const taskPromises = new Array<Promise<TaskDocument>>();
    for (let i = 0; i < nTasks; i++) {
        taskPromises.push(
            testKit.models.task.create({
                ...testKit.taskData.task,
                user: userId,
                status: status,
                createdAt: faker.date.anytime(),
            }),
        );
    }
    return await Promise.all(taskPromises);
}
