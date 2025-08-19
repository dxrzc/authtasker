import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserValidator } from './create-user.validator';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';

export class ResetPasswordValidator extends PickType(CreateUserValidator, ['password'] as const) {
    async validate(input: { password: string }): Promise<ResetPasswordValidator> {
        const data = new ResetPasswordValidator();
        data.password = input.password;
        const errors = await validate(data, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));

        return data;
    }
}