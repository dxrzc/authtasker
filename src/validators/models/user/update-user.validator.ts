import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { CreateUserValidator } from "./create-user.validator";
import { ValidationResult } from "../../types/validation-result.type";
import { validationOptionsConfig } from "../../config/validation.config";
import { returnFirstError } from "../../helpers/return-first-error.helper";

export class UpdateUserValidator extends PartialType(CreateUserValidator) {

    static async validateAndTransform(data: object): ValidationResult<UpdateUserValidator> {
        if (Object.keys(data).length === 0)
            return ['At least one field is required to update the user', undefined];

        const user = new UpdateUserValidator();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), undefined];

        return [undefined, plainToInstance(UpdateUserValidator, user)];
    }
}