import { CreateTaskDto } from 'src/dtos/models/tasks/create-task.dto';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { TasksDataGenerator } from 'src/generators/tasks.generator';
import { taskConstraints } from 'src/constraints/task.constraints';

describe('CreateTaskDto', () => {
    const generator = new TasksDataGenerator();
    let validData: typeof generator.task;

    beforeEach(() => {
        validData = generator.task;
    });

    it('should validate and transform valid data', async () => {
        const result = await CreateTaskDto.validateAndTransform(validData);
        expect(result).toBeInstanceOf(CreateTaskDto);
        expect(result.name).toBe(validData.name);
        expect(result.description).toBe(validData.description);
        expect(result.status).toBe(validData.status);
        expect(result.priority).toBe(validData.priority);
    });

    it('should trim and lowercase name', async () => {
        const data = { ...validData, name: '  ' + validData.name.toUpperCase() + '  ' };
        const result = await CreateTaskDto.validateAndTransform(data);
        expect(result.name).toBe(validData.name);
    });

    it('should throw if name is missing', async () => {
        const data = { ...validData, name: undefined };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.NAME_NOT_PROVIDED),
        );
    });

    it('should throw if name is too short', async () => {
        const data = { ...validData, name: 'a'.repeat(taskConstraints.MIN_NAME_LENGTH - 1) };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if name is too long', async () => {
        const data = { ...validData, name: 'a'.repeat(taskConstraints.MAX_NAME_LENGTH + 1) };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if description is missing', async () => {
        const data = { ...validData, description: undefined };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.DESCRIPTION_NOT_PROVIDED),
        );
    });

    it('should throw if description is too short', async () => {
        const data = {
            ...validData,
            description: 'a'.repeat(taskConstraints.MIN_DESCRIPTION_LENGTH - 1),
        };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
        );
    });

    it('should throw if description is too long', async () => {
        const data = {
            ...validData,
            description: 'a'.repeat(taskConstraints.MAX_DESCRIPTION_LENGTH + 1),
        };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
        );
    });

    it('should throw if status is missing', async () => {
        const data = { ...validData, status: undefined };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.STATUS_NOT_PROVIDED),
        );
    });

    it('should throw if status is invalid', async () => {
        const data = { ...validData, status: 'invalid-status' };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_STATUS),
        );
    });

    it('should throw if priority is missing', async () => {
        const data = { ...validData, priority: undefined };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.PRIORITY_NOT_PROVIDED),
        );
    });

    it('should throw if priority is invalid', async () => {
        const data = { ...validData, priority: 'invalid-priority' };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_PRIORITY),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { ...validData, extra: 'property' };
        await expect(CreateTaskDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
