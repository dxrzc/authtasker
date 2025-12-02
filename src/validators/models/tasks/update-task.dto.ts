import { validate } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { plainToInstance } from 'class-transformer';
import { CreateTaskDto } from './create-task.dto';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';

export class UpdateTaskDto extends PartialType(CreateTaskDto) {
    static async validateNewAndTransform(data: object): Promise<UpdateTaskDto> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(tasksApiErrors.NO_PROPERTIES_TO_UPDATE);

        const user = new UpdateTaskDto();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(returnFirstError(errors));

        return plainToInstance(UpdateTaskDto, user);
    }
}
