export const tasksPriority = ['low', 'medium', 'high'] as const;
export type TasksPriority = (typeof tasksPriority)[number];
