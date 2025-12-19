export const tasksStatus = ['pending', 'in-progress', 'completed', 'archived'] as const;
export type TasksStatus = (typeof tasksStatus)[number];
