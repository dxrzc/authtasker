import { IsDefined, IsEmail, MaxLength, MinLength, validate } from "class-validator";
import { CreateUserValidator } from "./create-user.validator";
import { errorMessages } from '@root/common/errors/messages';
import { ValidationResult } from '@root/validators/types';
import { validationOptionsConfig } from '@root/validators/config';
import { returnFirstError } from '@root/validators/helpers';
import {
    emailMissingErr,
    passwordBadLengthErr,
    passwordMaxLength,
    passwordMinLength,
    passwordMissingErr
} from '@root/validators/errors/user.errors';

export class LoginUserValidator implements Pick<CreateUserValidator, 'email' | 'password'> {

    @IsDefined({ message: emailMissingErr })
    @IsEmail({}, { message: errorMessages.INVALID_EMAIL })
    email!: string;

    @IsDefined({ message: passwordMissingErr })
    @MaxLength(passwordMaxLength, { message: passwordBadLengthErr })
    @MinLength(passwordMinLength, { message: passwordBadLengthErr })
    password!: string;

    static async validate(data: object): ValidationResult<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, user];
    }
}