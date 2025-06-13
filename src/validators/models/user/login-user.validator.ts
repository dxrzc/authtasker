import { CreateUserValidator } from './create-user.validator';
import { usersLimits } from '@root/common/constants/user.constants';
import { ValidationResult } from '@root/types/validation/validation-result.type';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { IsDefined, IsEmail, MaxLength, MinLength, validate } from 'class-validator';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

export class LoginUserValidator implements Pick<CreateUserValidator, 'email' | 'password'> {

    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, { message: usersApiErrors.INVALID_EMAIL })
    email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    password!: string;

    async validate(data: object): ValidationResult<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);
        
        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, user];
    }
}