import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    static async validateNewAndTransform(data: object): Promise<UpdateTaskDto> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(tasksApiErrors.NO_PROPERTIES_TO_UPDATE);
        return await validateAndTransformDto(UpdateTaskDto, data);
    }
}
