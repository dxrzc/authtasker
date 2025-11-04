import { faker } from '@faker-js/faker/.';
import { tasksLimits } from 'src/common/constants/tasks.constants';
import { commonErrors } from 'src/common/errors/messages/common.error.messages';
import { tasksApiErrors } from 'src/common/errors/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';
import { TasksDataGenerator } from 'src/seed/generators/tasks.generator';
import { CreateTaskValidator } from 'src/validators/models/tasks/create-task.validator';

const createTaskValidator = new CreateTaskValidator();
const tasksData = new TasksDataGenerator();

describe('CreateTaskValidator', () => {
    describe('invalid name', () => {
        test('throw InvalidInputError if too short', async () => {
            const data = {
                name: 'ab',
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
            );
        });

        test('throw InvalidInputError if too long', async () => {
            const data = {
                name: faker.string.alpha(tasksLimits.MAX_NAME_LENGTH + 1),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
            );
        });

        test('throw InvalidInputError if missing', async () => {
            const data = {
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.NAME_NOT_PROVIDED),
            );
        });

        test('throw InvalidInputError if not a string', async () => {
            const data = {
                name: 12345,
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
            );
        });
    });

    describe('invalid description', () => {
        test('throw InvalidInputError if too short', async () => {
            const data = {
                name: tasksData.name(),
                description: 'short',
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
            );
        });

        test('throw InvalidInputError if too long', async () => {
            const data = {
                name: tasksData.name(),
                description: faker.string.alpha(tasksLimits.MAX_DESCRIPTION_LENGTH + 1),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
            );
        });

        test('throw InvalidInputError if missing', async () => {
            const data = {
                name: tasksData.name(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.DESCRIPTION_NOT_PROVIDED),
            );
        });

        test('throw InvalidInputError if not a string', async () => {
            const data = {
                name: tasksData.name(),
                description: 12345,
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
            );
        });
    });

    describe('invalid status', () => {
        test('throw InvalidInputError if invalid', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: 'random-status',
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_STATUS),
            );
        });

        test('throw InvalidInputError if missing', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                priority: tasksData.priority(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_STATUS),
            );
        });
    });

    describe('invalid priority', () => {
        test('throw InvalidInputError if invalid', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: 'urgent',
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_PRIORITY),
            );
        });

        test('throw InvalidInputError if missing', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
            };
            await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
                new InvalidInputError(tasksApiErrors.INVALID_PRIORITY),
            );
        });
    });

    test('throw InvalidInputError when unexpected property is provided', async () => {
        const data = {
            name: tasksData.name(),
            description: tasksData.description(),
            status: tasksData.status(),
            user: '12345',
        };
        await expect(() => createTaskValidator.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });

    describe('valid input', () => {
        test('return a CreateTaskValidator instance', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            const result = await createTaskValidator.validateAndTransform(data);
            expect(result).toBeInstanceOf(CreateTaskValidator);
        });

        test('transform name to lowercase and trim it', async () => {
            const data = {
                name: ` ${faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            const result = await createTaskValidator.validateAndTransform(data);
            expect(result.name).toBe(data.name.trim().toLowerCase());
        });

        test('return all other properties unchanged', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority(),
            };
            const result = await createTaskValidator.validateAndTransform(data);
            expect(result.description).toBe(data.description);
            expect(result.status).toBe(data.status);
            expect(result.priority).toBe(data.priority);
        });
    });
});
