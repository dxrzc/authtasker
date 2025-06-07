import { IsDefined, IsEmail, IsString, validate } from "class-validator";
import { CreateUserValidator } from "./create-user.validator";
import { ValidationResult } from "../../types/validation-result.type";
import { validationOptionsConfig } from "../../config/validation.config";
import { returnFirstError } from "../../helpers/return-first-error.helper";

export class LoginUserValidator implements Pick<CreateUserValidator, 'email' | 'password'> {

    @IsDefined()
    @IsEmail()
    email!: string;

    @IsDefined()
    @IsString()
    password!: string;

    static async validate(data: object): ValidationResult<LoginUserValidator> {
        const user = new LoginUserValidator();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), undefined];

        return [undefined, user];
    }
}