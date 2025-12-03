import { UpdateTaskDto } from 'src/dtos/models/tasks/update-task.dto';
import { tasksLimits } from 'src/constants/tasks.constants';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { TasksDataGenerator } from 'src/generators/tasks.generator';

describe('UpdateTaskDto', () => {
    const generator = new TasksDataGenerator();
    let validData: typeof generator.task;

    beforeEach(() => {
        validData = generator.task;
    });

    it('should validate and transform valid data (all fields)', async () => {
        const result = await UpdateTaskDto.validateNewAndTransform(validData);
        expect(result).toBeInstanceOf(UpdateTaskDto);
        expect(result.name).toBe(validData.name);
        expect(result.description).toBe(validData.description);
        expect(result.status).toBe(validData.status);
        expect(result.priority).toBe(validData.priority);
    });

    it('should validate and transform valid data (partial fields)', async () => {
        const partialData = { name: validData.name };
        const result = await UpdateTaskDto.validateNewAndTransform(partialData);
        expect(result).toBeInstanceOf(UpdateTaskDto);
        expect(result.name).toBe(validData.name);
        expect(result.description).toBeUndefined();
        expect(result.status).toBeUndefined();
        expect(result.priority).toBeUndefined();
    });

    it('should throw if no properties to update', async () => {
        await expect(UpdateTaskDto.validateNewAndTransform({})).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.NO_PROPERTIES_TO_UPDATE),
        );
    });

    it('should trim and lowercase name', async () => {
        const data = { name: '  ' + validData.name.toUpperCase() + '  ' };
        const result = await UpdateTaskDto.validateNewAndTransform(data);
        expect(result.name).toBe(validData.name);
    });

    it('should throw if name is too short', async () => {
        const data = { name: 'a'.repeat(tasksLimits.MIN_NAME_LENGTH - 1) };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if name is too long', async () => {
        const data = { name: 'a'.repeat(tasksLimits.MAX_NAME_LENGTH + 1) };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if description is too short', async () => {
        const data = { description: 'a'.repeat(tasksLimits.MIN_DESCRIPTION_LENGTH - 1) };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
        );
    });

    it('should throw if description is too long', async () => {
        const data = { description: 'a'.repeat(tasksLimits.MAX_DESCRIPTION_LENGTH + 1) };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_DESCRIPTION_LENGTH),
        );
    });

    it('should throw if status is invalid', async () => {
        const data = { status: 'invalid-status' };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_STATUS),
        );
    });

    it('should throw if priority is invalid', async () => {
        const data = { priority: 'invalid-priority' };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(tasksApiErrors.INVALID_PRIORITY),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { name: validData.name, extra: 'property' };
        await expect(UpdateTaskDto.validateNewAndTransform(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
