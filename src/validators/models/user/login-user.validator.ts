import { CreateUserValidator } from './create-user.validator';
import { usersLimits } from '@root/common/constants/user.constants';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { IsDefined, IsEmail, MaxLength, MinLength, validate } from 'class-validator';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';

export class LoginUserValidator implements Pick<CreateUserValidator, 'email' | 'password'> {

    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, { message: usersApiErrors.INVALID_EMAIL })
    email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    password!: string;

    async validate(data: object): Promise<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));

        return user;
    }
}