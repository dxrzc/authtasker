import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';
import { usersApiErrors } from "@root/common/errors/messages/users-api.error.messages";
import { returnFirstError } from '@root/validators/helpers/return-first-error.helper';
import { validationOptionsConfig } from '@root/validators/config/validation.config';
import { IsEmail, IsOptional, MaxLength, validate } from "class-validator";
import { usersLimits } from '@root/common/constants/user.constants';

export class ForgotPasswordValidator {
    @IsOptional()
    @MaxLength(usersLimits.MAX_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    username?: string;

    @IsOptional()
    @IsEmail(undefined, { message: usersApiErrors.INVALID_EMAIL })
    email?: string;

    async validate(data: object): Promise<ForgotPasswordValidator> {
        const input = new ForgotPasswordValidator();
        Object.assign(input, data);

        const dataLength = Object.keys(data).length;
        if (dataLength !== 1)
            throw new InvalidInputError(usersApiErrors.INVALID_FORGOT_PASSWORD_INPUT);

        const errors = await validate(input, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));

        return input;
    }
}
