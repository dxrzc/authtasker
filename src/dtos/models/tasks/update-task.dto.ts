import { PartialType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    static async validateNewAndTransform(data: Record<string, unknown>): Promise<UpdateTaskDto> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(tasksApiErrors.NO_PROPERTIES_TO_UPDATE);
        return await parseAndValidateOrThrow(UpdateTaskDto, data);
    }
}
