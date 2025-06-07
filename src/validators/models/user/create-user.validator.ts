import { IsDefined, IsEmail, IsString, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { Exact } from "@root/types/shared/exact.type";
import { usersLimits } from '@root/common/constants';
import { UserRequest } from '@root/types/user';
import { toLowerCase } from '@root/validators/helpers/to-lowercase.helper';
import { ValidationResult } from '@root/validators/types/validation-result.type';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';

export class CreateUserValidator implements Exact<CreateUserValidator, UserRequest> {

    @IsDefined()
    @MinLength(usersLimits.MIN_NAME_LENGTH)
    @MaxLength(usersLimits.MAX_NAME_LENGTH)
    @IsString()
    @Transform(toLowerCase)
    name!: string;

    @IsDefined()
    @IsEmail()
    email!: string;

    @IsDefined()
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH)
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH)
    @IsString()
    password!: string;

    static async validateAndTransform(data: object): ValidationResult<CreateUserValidator> {
        const user = new CreateUserValidator();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), undefined];

        return [undefined, plainToInstance(CreateUserValidator, user)];
    }
}