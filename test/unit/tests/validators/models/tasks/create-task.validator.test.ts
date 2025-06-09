import { faker } from '@faker-js/faker/.';
import { tasksLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { TasksDataGenerator } from '@root/seed/generators';
import { tasksPriority, tasksStatus } from '@root/types/tasks';
import { UNEXPECTED_PROPERTY_PROVIDED } from '@root/validators/errors/common.errors';
import { CreateTaskValidator } from '@root/validators/models/tasks';

const createTaskValidator = new CreateTaskValidator();
const tasksData = new TasksDataGenerator();

describe('CreateTaskValidator', () => {
    describe('invalid name', () => {
        const missingNameErr = errorMessages.PROPERTY_NOT_PROVIDED('name');
        const badNameLengthErr = errorMessages.PROPERTY_BAD_LENGTH('name',
            tasksLimits.MIN_NAME_LENGTH,
            tasksLimits.MAX_NAME_LENGTH
        );

        test.concurrent('return error if too short', async () => {
            const data = {
                name: 'ab',
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(badNameLengthErr);
        });

        test.concurrent('return error if too long', async () => {
            const data = {
                name: faker.string.alpha(tasksLimits.MAX_NAME_LENGTH + 1),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(badNameLengthErr);
        });

        test.concurrent('return error if missing', async () => {
            const data = {
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(missingNameErr);
        });

        test.concurrent('return error if not a string', async () => {
            const data = {
                name: 12345,
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toBeDefined();
            expect(error).toStrictEqual(badNameLengthErr);
        });
    });

    describe('invalid description', () => {
        const missingDescErr = errorMessages.PROPERTY_NOT_PROVIDED('description');
        const badDescLengthErr = errorMessages.PROPERTY_BAD_LENGTH('description',
            tasksLimits.MIN_DESCRIPTION_LENGTH,
            tasksLimits.MAX_DESCRIPTION_LENGTH
        );

        test.concurrent('return error if too short', async () => {
            const data = {
                name: tasksData.name(),
                description: 'short',
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(badDescLengthErr);
        });

        test.concurrent('return error if too long', async () => {
            const data = {
                name: tasksData.name(),
                description: faker.string.alpha(tasksLimits.MAX_DESCRIPTION_LENGTH + 1),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(badDescLengthErr);
        });

        test.concurrent('return error if missing', async () => {
            const data = {
                name: tasksData.name(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(missingDescErr);
        });

        test.concurrent('return error if not a string', async () => {
            const data = {
                name: tasksData.name(),
                description: 12345,
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(badDescLengthErr);
        });
    });

    describe('invalid status', () => {
        const statusErr = errorMessages.PROPERTY_NOT_IN('status', <any>tasksStatus);

        test.concurrent('return error if invalid', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: 'random-status',
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(statusErr);
        });

        test.concurrent('return error if missing', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                priority: tasksData.priority()
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(statusErr);
        });
    });

    describe('invalid priority', () => {
        const priorityErr = errorMessages.PROPERTY_NOT_IN('priority', <any>tasksPriority);

        test.concurrent('return error if invalid', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: 'urgent'
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(priorityErr);
        });

        test.concurrent('return error if missing', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
            };
            const [error, _] = await createTaskValidator.validateProperties(data);
            expect(error).toStrictEqual(priorityErr);
        });
    });

    test.concurrent('return error when unexpected property is provided', async () => {
        const data = {
            name: tasksData.name(),
            description: tasksData.description(),
            status: tasksData.status(),
            user: '12345' //!
        };
        const [error, _] = await createTaskValidator.validateProperties(data);
        expect(error).toBe(UNEXPECTED_PROPERTY_PROVIDED);
    });

    describe('valid input', () => {
        test.concurrent('returns a CreateTaskValidator instance and null error', async () => {
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

        describe('Properties transformation', () => {
            test.concurrent('transform name and description to lowercase and trim', async () => {
                const data = {
                    name: ` ${faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - 2)} `,
                    description: `  ${faker.string.alpha(tasksLimits.MAX_DESCRIPTION_LENGTH - 4)}  `,
                    status: tasksData.status(),
                    priority: tasksData.priority()
                };
                const [_, result] = await createTaskValidator.validateProperties(data);
                expect(result?.name).toBe(data.name.trim().toLowerCase());
                expect(result?.description).toBe(data.description.trim().toLowerCase());
            });
        });
    });
});