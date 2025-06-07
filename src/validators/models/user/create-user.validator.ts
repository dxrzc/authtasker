import { IsDefined, IsEmail, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { Exact } from "@root/types/shared/exact.type";
import { UserRequest } from '@root/types/user';
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { ValidationResult } from '@root/validators/types/validation-result.type';
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

export class CreateUserValidator implements Exact<CreateUserValidator, UserRequest> {

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

    static async validateAndTransform(data: object): ValidationResult<CreateUserValidator> {
        const user = new CreateUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(CreateUserValidator, user)];
    }
}