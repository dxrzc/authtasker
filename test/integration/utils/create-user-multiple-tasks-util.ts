import { createTask } from './createTask.util';

export async function createUserMultipleTasks(sessionToken: string, n: number): Promise<void> {
    const promises = new Array<Promise<unknown>>();
    for (let i = 0; i < n; i++) promises.push(createTask(sessionToken));
    await Promise.all(promises);
}
