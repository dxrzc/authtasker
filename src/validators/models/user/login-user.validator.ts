import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserValidator } from './create-user.validator';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';

export class LoginUserValidator extends PickType(CreateUserValidator, [
    'email',
    'password',
] as const) {
    async validate(data: object): Promise<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(authErrors.INVALID_CREDENTIALS);

        return user;
    }
}
