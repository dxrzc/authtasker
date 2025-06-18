import { faker } from '@faker-js/faker/.';
import { tasksLimits } from '@root/common/constants/tasks.constants';
import { commonErrors } from '@root/common/errors/messages/common.error.messages';
import { tasksApiErrors } from '@root/common/errors/messages/tasks-api.error.messages';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';
import { UpdateTaskValidator } from '@root/validators/models/tasks/update-task.validator';

const tasksData = new TasksDataGenerator();
const updateTaskValidator = new UpdateTaskValidator();

describe('UpdateTaskValidator', () => {
    test.concurrent('throw InvalidInputError if all fields are missing', async () => {
        await expect(() => updateTaskValidator.validateNewAndTransform({}))
            .rejects.toThrow(new InvalidInputError(tasksApiErrors.NO_PROPERTIES_TO_UPDATE));
    });

    test.concurrent('throw InvalidInputError if name is invalid', async () => {
        const data = { name: 'ab' };
        await expect(() => updateTaskValidator.validateNewAndTransform(data))
            .rejects.toThrow(new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH));
    });

    test.concurrent('throw InvalidInputError if description is invalid', async () => {
        const data = { description: 'x' };
        await expect(() => updateTaskValidator.validateNewAndTransform(data))
            .rejects.toThrow(new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH));
    });

    test.concurrent('throw InvalidInputError if status is invalid', async () => {
        const data = { status: 'not-valid' };
        await expect(() => updateTaskValidator.validateNewAndTransform(data))
            .rejects.toThrow(new InvalidInputError(tasksApiErrors.INVALID_STATUS));
    });

    test.concurrent('throw InvalidInputError if priority is invalid', async () => {
        const data = { priority: 'urgent' };
        await expect(() => updateTaskValidator.validateNewAndTransform(data))
            .rejects.toThrow(new InvalidInputError(tasksApiErrors.INVALID_PRIORITY));
    });

    test.concurrent('succeed with one valid field (e.g. status)', async () => {
        const data = { status: tasksData.status() };
        const result = await updateTaskValidator.validateNewAndTransform(data);
        expect(result).toBeInstanceOf(UpdateTaskValidator);
        expect(result.status).toBe(data.status);
    });

    test.concurrent('throw InvalidInputError when unexpected property is provided', async () => {
        const data = {
            name: 'Updated name',
            description: 'Updated description',
            status: tasksData.status(),
            priority: tasksData.priority(),
            user: '123'
        };
        await expect(() => updateTaskValidator.validateNewAndTransform(data))
            .rejects.toThrow(new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED));
    });

    describe('valid input', () => {
        test.concurrent('return UpdateTaskValidator instance', async () => {
            const data = {
                name: tasksData.name(),
            };
            const result = await updateTaskValidator.validateNewAndTransform(data);
            expect(result).toBeInstanceOf(UpdateTaskValidator);
        });

        test.concurrent('transform name to lowercase and trim', async () => {
            const data = {
                name: ` ${faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
            };
            const result = await updateTaskValidator.validateNewAndTransform(data);
            expect(result.name).toBe(data.name.trim().toLowerCase());
        });

        test.concurrent('return all other properties unchanged', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const result = await updateTaskValidator.validateNewAndTransform(data);
            expect(result.description).toBe(data.description);
            expect(result.status).toBe(data.status);
            expect(result.priority).toBe(data.priority);
        });
    });
});