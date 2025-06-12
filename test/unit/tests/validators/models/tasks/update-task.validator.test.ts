import { faker } from '@faker-js/faker/.';
import { tasksLimits } from '@root/common/constants/tasks.constants';
import { commonErrors } from '@root/common/errors/messages/common.error.messages';
import { tasksApiErrors } from '@root/common/errors/messages/tasks-api.error.messages';
import { TasksDataGenerator } from '@root/seed/generators/tasks.generator';
import { UpdateTaskValidator } from '@root/validators/models/tasks/update-task.validator';

const tasksData = new TasksDataGenerator();
const updateTaskValidator = new UpdateTaskValidator();

describe('UpdateTaskValidator', () => {
    test.concurrent('return error if all fields are missing', async () => {
        const [error, _] = await updateTaskValidator.validateNewProperties({});
        expect(error).toBe(tasksApiErrors.NO_PROPERTIES_TO_UPDATE);
    });

    test.concurrent('return error if name is invalid', async () => {
        const data = { name: 'ab' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(tasksApiErrors.INVALID_NAME_LENGTH);
    });

    test.concurrent('return error if description is invalid', async () => {
        const data = { description: 'x' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(tasksApiErrors.INVALID_DESCRIPTION_LENGTH);
    });

    test.concurrent('return error if status is invalid', async () => {
        const data = { status: 'not-valid' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(tasksApiErrors.INVALID_STATUS);
    });

    test.concurrent('return error if priority is invalid', async () => {
        const data = { priority: 'urgent' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(tasksApiErrors.INVALID_PRIORITY);
    });

    test.concurrent('succeed with one valid field (e.g. status)', async () => {
        const data = { status: tasksData.status() };
        const [error, result] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBeNull();        
    });

    test.concurrent('return error when unexpected property is provided', async () => {
        const data = {
            name: 'Updated name',
            description: 'Updated description',
            status: tasksData.status(),
            priority: tasksData.priority(),
            user: '123'
        };

        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(commonErrors.UNEXPECTED_PROPERTY_PROVIDED);
    });

    describe('valid input', () => {
        test.concurrent('return UpdateTaskValidator instance and null error', async () => {
            const data = {
                name: tasksData.name(),
            };
            const [error, result] = await updateTaskValidator.validateNewProperties(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(UpdateTaskValidator);
        });

        test.concurrent('transform name to lowercase and trim', async () => {
            const data = {
                name: ` ${faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
            };
            const [_, result] = await updateTaskValidator.validateNewProperties(data);
            expect(result?.name).toBe(data.name.toLowerCase().trim());
        });

        test.concurrent('return all other properties unchaged', async () => {
            const data = {
                name: tasksData.name(),
                description: tasksData.description(),
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [_, result] = await updateTaskValidator.validateNewProperties(data);
            expect(result?.description).toBe(data.description);
            expect(result?.status).toBe(data.status);
            expect(result?.priority).toBe(data.priority);
        });
    });
});
