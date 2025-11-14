import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserValidator } from './create-user.validator';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { InvalidCredentialsInput } from 'src/errors/invalid-input-error.class';

export class LoginUserValidator extends PickType(CreateUserValidator, [
    'email',
    'password',
] as const) {
    async validate(data: object): Promise<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidCredentialsInput();

        return user;
    }
}
