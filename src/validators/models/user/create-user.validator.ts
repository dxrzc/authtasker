import { plainToInstance, Transform } from 'class-transformer';
import { usersLimits } from '@root/common/constants/user.constants';
import { ValidationResult } from '@root/types/validation/validation-result.type';
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { IsDefined, IsEmail, MaxLength, MinLength, validate } from 'class-validator';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

export class CreateUserValidator {

    @IsDefined({ message: usersApiErrors.NAME_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    @MaxLength(usersLimits.MAX_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, { message: usersApiErrors.INVALID_EMAIL })
    email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    password!: string;

    async validateProperties(data: object): ValidationResult<CreateUserValidator> {
        const user = new CreateUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(CreateUserValidator, user)];
    }
}