import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { PartialType } from "@nestjs/mapped-types";
import { CreateUserValidator } from "./create-user.validator";
import { errorMessages } from '@root/common/errors/messages';
import { returnFirstError } from '@root/validators/helpers';
import { validationOptionsConfig } from '@root/validators/config';
import { ValidationResult } from '@root/types/validation';

export class UpdateUserValidator extends PartialType(CreateUserValidator) {

    async validateNewProperties(data: object): ValidationResult<UpdateUserValidator> {
        if (Object.keys(data).length === 0)
            return [errorMessages.NO_PROPERTIES_PROVIDED_WHEN_UPDATE('user'), null];

        const user = new UpdateUserValidator();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(UpdateUserValidator, user)];
    }
}