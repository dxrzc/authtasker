import { faker } from '@faker-js/faker';
import { tasksLimits } from '@root/common/constants/tasks.constants';
import { TasksStatus, tasksStatus } from "@root/types/tasks/task-status.type";
import { TasksPriority, tasksPriority } from "@root/types/tasks/task-priority.type";

export class TasksDataGenerator {

    constructor() {}

    name(): string {
        const prefix = 'Task ';
        const random = faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - prefix.length);
        const name = `${prefix}${random}`;
        return name
            .toLowerCase()
            .trim();
    }

    description(): string {
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

    status(): TasksStatus {
        const n = faker.number.int({
            max: tasksStatus.length - 1
        });
        return tasksStatus.at(n)!;
    }

    priority(): TasksPriority {
        const n = faker.number.int({
            max: tasksPriority.length - 1
        });
        return tasksPriority.at(n)!;
    }

    fullTask() {
        return {
            name: this.name(),
            description: this.description(),
            status: this.status(),
            priority: this.priority(),
        }
    }
}