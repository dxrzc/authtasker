import { validate } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { plainToInstance } from 'class-transformer';
import { CreateTaskValidator } from './create-task.validator';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { tasksApiErrors } from 'src/common/errors/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';

export class UpdateTaskValidator extends PartialType(CreateTaskValidator) {

    async validateNewAndTransform(data: object): Promise<UpdateTaskValidator> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(tasksApiErrors.NO_PROPERTIES_TO_UPDATE);

        const user = new UpdateTaskValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));

        return plainToInstance(UpdateTaskValidator, user)
    }
}