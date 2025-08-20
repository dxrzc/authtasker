import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserValidator } from './create-user.validator';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';

// TODO: don't show "Invalid password length message"
export class LoginUserValidator extends PickType(CreateUserValidator, ['email', 'password'] as const) {

    async validate(data: object): Promise<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));

        return user;
    }
}