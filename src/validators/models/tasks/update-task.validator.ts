import { validate } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { plainToInstance } from 'class-transformer';
import { CreateTaskValidator } from './create-task.validator';
import { ValidationResult } from '@root/types/validation/validation-result.type';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { tasksApiErrors } from '@root/common/errors/messages/tasks-api.error.messages';

export class UpdateTaskValidator extends PartialType(CreateTaskValidator) {

    async validateNewProperties(data: object): ValidationResult<UpdateTaskValidator> {
        if (Object.keys(data).length === 0)
            return [tasksApiErrors.NO_PROPERTIES_TO_UPDATE, null];

        const user = new UpdateTaskValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(UpdateTaskValidator, user)];
    }
}