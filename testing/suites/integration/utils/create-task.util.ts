import { testKit } from '@integration/kit/test.kit';
import { ITasks } from 'src/interfaces/tasks/task.interface';

type TaskJson = Omit<ITasks, 'updatedAt' | 'createdAt' | 'user'> & {
    createdAt: string;
    updatedAt: string;
    user: string;
};

export async function createTask(userId: string): Promise<TaskJson> {
    const task = await testKit.models.task.create({
        ...testKit.taskData.task,
        user: userId,
    });
    return {
        ...task.toJSON(),
        createdAt: task.createdAt.toISOString(),
        updatedAt: task.updatedAt.toISOString(),
        user: task.user.toString(),
    };
}
