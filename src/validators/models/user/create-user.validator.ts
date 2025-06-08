import { IsDefined, IsEmail, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import {
    emailMissingErr,
    nameBadLengthErr,
    nameMaxLength,
    nameMinLength,
    nameMissingErr,
    passwordBadLengthErr,
    passwordMaxLength,
    passwordMinLength,
    passwordMissingErr
} from '@root/validators/errors/user.errors';
import { errorMessages } from '@root/common/errors/messages';
import { ValidationResult } from '@root/types/validation';

export class CreateUserValidator {

    @IsDefined({ message: nameMissingErr })
    @MinLength(nameMinLength, { message: nameBadLengthErr })
    @MaxLength(nameMaxLength, { message: nameBadLengthErr })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({ message: emailMissingErr })
    @IsEmail({}, {message: errorMessages.INVALID_EMAIL})
    email!: string;

    @IsDefined({ message: passwordMissingErr })
    @MinLength(passwordMinLength, { message: passwordBadLengthErr })
    @MaxLength(passwordMaxLength, { message: passwordBadLengthErr })
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