import { faker } from '@faker-js/faker/.';
import { tasksLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { TasksDataGenerator } from '@root/seed/generators';
import { tasksPriority, tasksStatus } from '@root/types/tasks';
import { UNEXPECTED_PROPERTY_PROVIDED } from '@root/validators/errors/common.errors';
import { UpdateTaskValidator } from '@root/validators/models/tasks';

const tasksData = new TasksDataGenerator();
const updateTaskValidator = new UpdateTaskValidator();

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
        const [error, _] = await updateTaskValidator.validateNewProperties({});
        expect(error).toBe(noPropertiesProvidedErr);
    });

    test.concurrent('return error if name is invalid', async () => {
        const data = { name: 'ab' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(badNameLengthErr);
    });

    test.concurrent('return error if description is invalid', async () => {
        const data = { description: 'x' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(badDescLengthErr);
    });

    test.concurrent('return error if status is invalid', async () => {
        const data = { status: 'not-valid' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(statusErr);
    });

    test.concurrent('return error if priority is invalid', async () => {
        const data = { priority: 'urgent' };
        const [error, _] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBe(priorityErr);
    });

    test.concurrent('succeed with one valid field (e.g. name)', async () => {
        const data = { name: 'New task name' };
        const [error, result] = await updateTaskValidator.validateNewProperties(data);
        expect(error).toBeNull();
        expect(result?.name).toBe(data.name.toLowerCase().trim());
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
        expect(error).toBe(UNEXPECTED_PROPERTY_PROVIDED);
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
        
        test.concurrent('transform name and description to lowercase and trim', async () => {
            const data = {
                name: ` ${faker.string.alpha(tasksLimits.MAX_NAME_LENGTH - 2)} `,
                description: `  ${faker.string.alpha(tasksLimits.MAX_DESCRIPTION_LENGTH - 4)}  `,
                status: tasksData.status(),
                priority: tasksData.priority()
            };
            const [error, result] = await updateTaskValidator.validateNewProperties(data);
            expect(result?.name).toBe(data.name.trim().toLowerCase());
            expect(result?.description).toBe(data.description.trim().toLowerCase());
        });
    });
});
