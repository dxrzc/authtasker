import { TaskPriorityDto } from 'src/dtos/models/tasks/task-priority.dto';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError, MaliciousInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { TasksDataGenerator } from 'src/generators/tasks.generator';

describe('TaskPriorityDto', () => {
    const generator = new TasksDataGenerator();
    let validData: typeof generator.task;

    beforeEach(() => {
        validData = generator.task;
    });

    it('should validate valid data', async () => {
        const result = await TaskPriorityDto.validate({ priority: validData.priority });
        expect(result).toBeInstanceOf(TaskPriorityDto);
        expect(result.priority).toBe(validData.priority);
    });

    it('should throw if priority is missing', async () => {
        const data = { priority: undefined };
        await expect(TaskPriorityDto.validate(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.PRIORITY_NOT_PROVIDED),
        );
    });

    it('should throw if priority is invalid', async () => {
        const data = { priority: 'invalid-priority' };
        await expect(TaskPriorityDto.validate(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_PRIORITY),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { priority: validData.priority, extra: 'property' };
        await expect(TaskPriorityDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });

    it('should throw MaliciousInputError if priority contains malicious content', async () => {
        const data = { priority: '<script>alert("XSS")</script>' };
        await expect(TaskPriorityDto.validate(data)).rejects.toThrow(MaliciousInputError);
    });
});
