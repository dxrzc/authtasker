import { faker } from '@faker-js/faker/.';
import { commonErrors, tasksApiErrors } from '@root/common/errors/messages';
import { CreateTaskValidator } from '@root/validators/models/tasks';
import { TasksDataGenerator } from '@root/seed/generators';
import { tasksLimits } from '@root/common/constants';

const createTaskValidator = new CreateTaskValidator();
const tasksData = new TasksDataGenerator();

describe('CreateTaskValidator', () => {
    describe('invalid name', () => {
        test.concurrent('return custom error if too short', async () => {
            const data = {
                name: 'ab',
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(tasksApiErrors.INVALID_NAME_LENGTH);
        });

        test.concurrent('return custom error if too long', async () => {
            const data = {
                name: faker.string.alpha(tasksLimits.MAX_NAME_LENGTH + 1),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(tasksApiErrors.INVALID_NAME_LENGTH);
        });

        test.concurrent('return custom error if missing', async () => {
            const data = {
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(tasksApiErrors.NAME_NOT_PROVIDED);
        });

        test.concurrent('return custom error if not a string', async () => {
            const data = {
                name: 12345,
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(tasksApiErrors.INVALID_NAME_LENGTH);
        });
    });

    describe('invalid description', () => {
        test.concurrent('return custom error if too short', async () => {
            const data = {
                name: tasksData.name(),
                description: 'short',
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_DESCRIPTION_LENGTH);
        });

        test.concurrent('return custom error if too long', async () => {
            const data = {
                name: tasksData.name(),
                description: faker.string.alpha(tasksLimits.MAX_DESCRIPTION_LENGTH + 1),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_DESCRIPTION_LENGTH);
        });

        test.concurrent('return custom error if missing', async () => {
            const data = {
                name: tasksData.name(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.DESCRIPTION_NOT_PROVIDED);
        });

        test.concurrent('return custom error if not a string', async () => {
            const data = {
                name: tasksData.name(),
                description: 12345,
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_DESCRIPTION_LENGTH);
        });
    });

    describe('invalid status', () => {
        test.concurrent('return custom error if invalid', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: 'random-status',
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_STATUS);
        });

        test.concurrent('return custom error if missing', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_STATUS);
        });
    });

    describe('invalid priority', () => {
        test.concurrent('return custom error if invalid', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: 'urgent'
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_PRIORITY);
        });

        test.concurrent('return custom error if missing', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(tasksApiErrors.INVALID_PRIORITY);
        });
    });

    test.concurrent('return custom error when unexpected property is provided', async () => {
        const data = {
            name: tasksData.name(),
            description: tasksData.description(),
            status: tasksData.status(),
            user: '12345' //!
        };
        const [error, _] = await createTaskValidator.validateProperties(data);
        expect(error).toBe(commonErrors.UNEXPECTED_PROPERTY_PROVIDED);
    });

    describe('valid input', () => {
        test.concurrent('return a CreateTaskValidator instance and null error', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, result] = await createTaskValidator.validateProperties(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(CreateTaskValidator);
        });

        test.concurrent('transform name to lowercase and trim it', async () => {
            const data = {
                name: ` ${faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [_, result] = await createTaskValidator.validateProperties(data);
            expect(result?.name).toBe(data.name.trim().toLowerCase());
        });

        test.concurrent('return all other properties unchanged', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [_, result] = await createTaskValidator.validateProperties(data);
            expect(result?.description).toBe(data.description);
            expect(result?.status).toBe(data.status);
            expect(result?.priority).toBe(data.priority);        
        });
    });
});