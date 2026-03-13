import { TaskDocument } from './task-document.type';

export type TasksFilters = Partial<Readonly<Pick<TaskDocument, 'user' | 'status' | 'priority'>>>;
