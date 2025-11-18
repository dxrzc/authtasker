import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { CreateUserValidator } from './create-user.validator';
import { PickType } from '@nestjs/mapped-types';
import { validate } from 'class-validator';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';

export class PasswordRecoveryValidator extends PickType(CreateUserValidator, ['email'] as const) {
    async validate(data: object): Promise<PasswordRecoveryValidator> {
        const user = new PasswordRecoveryValidator();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(returnFirstError(errors));
        return user;
    }
}
