import { PartialType } from '@nestjs/mapped-types';
import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { returnFirstError } from '@root/validators/helpers';
import { validationOptionsConfig } from '@root/validators/config';
import { ValidationResult } from '@root/types/validation';
import { usersApiErrors } from '@root/common/errors/messages';
import { CreateUserValidator } from '.';

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