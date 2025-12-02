import { TasksPriority, tasksPriority } from 'src/types/tasks/task-priority.type';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';

export class TaskPriorityDto {
    static validatePriority(priority: string): TasksPriority {
        if (!tasksPriority.includes(priority as TasksPriority)) {
            throw new InvalidInputError(tasksApiErrors.INVALID_PRIORITY);
        }
        return priority as TasksPriority;
    }
}
