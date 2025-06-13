import { validate } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { plainToInstance } from 'class-transformer';
import { CreateUserValidator } from './create-user.validator';
import { ValidationResult } from '@root/types/validation/validation-result.type';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

export class UpdateUserValidator extends PartialType(CreateUserValidator) {

    async validateNewProperties(data: object): ValidationResult<UpdateUserValidator> {
        if (Object.keys(data).length === 0)
            return [usersApiErrors.NO_PROPERTIES_TO_UPDATE, null];

        const user = new UpdateUserValidator();
        Object.assign(user, data);
        
        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(UpdateUserValidator, user)];
    }
}