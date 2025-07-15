import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserValidator } from './create-user.validator';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';

export class PasswordValidator extends PickType(CreateUserValidator, ['password'] as const) {
    async validate(password: string): Promise<string> {
        const data = new PasswordValidator();
        data.password = password;
        const errors = await validate(data, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));
        return password;
    }
}