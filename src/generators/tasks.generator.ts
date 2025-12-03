import { faker } from '@faker-js/faker';
import { tasksLimits } from 'src/constants/tasks.constants';
import { TasksPriority, tasksPriority } from 'src/types/tasks/task-priority.type';
import { TasksStatus, tasksStatus } from 'src/types/tasks/task-status.type';

export class TasksDataGenerator {
    constructor() {}

    get name(): string {
        const prefix = 'Task ';
        const random = faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - prefix.length);
        const name = `${prefix}${random}`;
        return name.toLowerCase().trim();
    }

    get description(): string {
        let description: string;
        let length: number;

        do {
            description = faker.lorem.text();
            length = description.length;
        } while (
            length > tasksLimits.MAX_DESCRIPTION_LENGTH ||
            length < tasksLimits.MIN_DESCRIPTION_LENGTH
        );

        return description;
    }

    get status(): TasksStatus {
        const n = faker.number.int({
            max: tasksStatus.length - 1,
        });
        return tasksStatus.at(n)!;
    }

    get priority(): TasksPriority {
        const n = faker.number.int({
            max: tasksPriority.length - 1,
        });
        return tasksPriority.at(n)!;
    }

    get task() {
        return {
            name: this.name,
            description: this.description,
            status: this.status,
            priority: this.priority,
        };
    }
}
