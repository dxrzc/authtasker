import { TaskStatusDto } from 'src/dtos/models/tasks/task-status.dto';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { TasksDataGenerator } from 'src/generators/tasks.generator';

describe('TaskStatusDto', () => {
    const generator = new TasksDataGenerator();
    let validData: typeof generator.task;

    beforeEach(() => {
        validData = generator.task;
    });

    it('should validate valid data', async () => {
        const result = await TaskStatusDto.validate({ status: validData.status });
        expect(result).toBeInstanceOf(TaskStatusDto);
        expect(result.status).toBe(validData.status);
    });

    it('should throw if status is missing', async () => {
        const data = { status: undefined };
        await expect(TaskStatusDto.validate(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.STATUS_NOT_PROVIDED),
        );
    });

    it('should throw if status is invalid', async () => {
        const data = { status: 'invalid-status' };
        await expect(TaskStatusDto.validate(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_STATUS),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { status: validData.status, extra: 'property' };
        await expect(TaskStatusDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
