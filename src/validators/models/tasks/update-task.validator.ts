import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { PartialType } from '@nestjs/mapped-types';
import { returnFirstError } from '@root/validators/helpers';
import { validationOptionsConfig } from '@root/validators/config';
import { ValidationResult } from '@root/types/validation';
import { tasksApiErrors } from '@root/common/errors/messages';
import { CreateTaskValidator } from '.';

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