import { tasksLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { TasksDataGenerator } from '@root/seed/generators';
import { tasksPriority, tasksStatus } from '@root/types/tasks';
import { UpdateTaskValidator } from '@root/validators/models/tasks';

const tasksData = new TasksDataGenerator();

describe('UpdateTaskValidator', () => {
    const statusErr = errorMessages.PROPERTY_NOT_IN('status', <any>tasksStatus);
    const priorityErr = errorMessages.PROPERTY_NOT_IN('priority', <any>tasksPriority);
    const noPropertiesProvidedErr = errorMessages.NO_PROPERTIES_PROVIDED_WHEN_UPDATE('task');
    const badNameLengthErr = errorMessages.PROPERTY_BAD_LENGTH('name',
        tasksLimits.MIN_NAME_LENGTH,
        tasksLimits.MAX_NAME_LENGTH
    );
    const badDescLengthErr = errorMessages.PROPERTY_BAD_LENGTH('description',
        tasksLimits.MIN_DESCRIPTION_LENGTH,
        tasksLimits.MAX_DESCRIPTION_LENGTH
    );

    test.concurrent('return error if all fields are missing', async () => {
        const [error, _] = await UpdateTaskValidator.validateAndTransform({});
        expect(error).toBe(noPropertiesProvidedErr);
    });

    test.concurrent('return error if name is invalid', async () => {
        const data = { name: 'ab' };
        const [error, _] = await UpdateTaskValidator.validateAndTransform(data);
        expect(error).toBe(badNameLengthErr);
    });

    test.concurrent('return error if description is invalid', async () => {
        const data = { description: 'x' };
        const [error, _] = await UpdateTaskValidator.validateAndTransform(data);
        expect(error).toBe(badDescLengthErr);
    });

    test.concurrent('return error if status is invalid', async () => {
        const data = { status: 'not-valid' };
        const [error, _] = await UpdateTaskValidator.validateAndTransform(data);
        expect(error).toBe(statusErr);
    });

    test.concurrent('return error if priority is invalid', async () => {
        const data = { priority: 'urgent' };
        const [error, _] = await UpdateTaskValidator.validateAndTransform(data);
        expect(error).toBe(priorityErr);
    });

    test.concurrent('succeed with one valid field (e.g. name)', async () => {
        const data = { name: 'New task name' };
        const [error, result] = await UpdateTaskValidator.validateAndTransform(data);
        expect(error).toBeNull();
        expect(result?.name).toBe(data.name.toLowerCase().trim());
    });

    test.concurrent('succeed with all fields valid', async () => {
        const data = {
            name: 'Updated name',
            description: 'Updated description',
            status: tasksData.status(),
            priority: tasksData.priority()
        };
        const [error, result] = await UpdateTaskValidator.validateAndTransform(data);
        expect(error).toBeNull();
        expect(result).toBeInstanceOf(UpdateTaskValidator);
        expect(result?.name).toBe(data.name.toLowerCase().trim());
        expect(result?.description).toBe(data.description.toLowerCase().trim());
        expect(result?.status).toBe(data.status);
        expect(result?.priority).toBe(data.priority);
    });
});
