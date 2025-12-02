import { TasksStatus, tasksStatus } from 'src/types/tasks/task-status.type';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';

export class TaskStatusDto {
    static validateStatus(status: string): TasksStatus {
        if (!tasksStatus.includes(status as TasksStatus)) {
            throw new InvalidInputError(tasksApiErrors.INVALID_STATUS);
        }
        return status as TasksStatus;
    }
}
