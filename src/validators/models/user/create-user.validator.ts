import { plainToInstance, Transform } from 'class-transformer';
import { usersLimits } from 'src/common/constants/user.constants';
import { toLowerCaseAndTrim } from 'src/validators/helpers/to-lowercase.helper';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { IsDefined, IsEmail, MaxLength, MinLength, validate } from 'class-validator';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';

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

    async validateAndTransform(data: object): Promise<CreateUserValidator> {
        const user = new CreateUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));

        return plainToInstance(CreateUserValidator, user);
    }
}