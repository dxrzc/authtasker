import { PartialType } from "@nestjs/mapped-types";
import { CreateTaskValidator } from "./create-task.validator";
import { validate } from "class-validator";
import { plainToInstance } from "class-transformer";
import { errorMessages } from '@root/common/errors/messages';
import { ValidationResult } from '@root/validators/types';
import { returnFirstError } from '@root/validators/helpers';
import { validationOptionsConfig } from '@root/validators/config';

export class UpdateTaskValidator extends PartialType(CreateTaskValidator) {

    static async validateAndTransform(data: object): ValidationResult<UpdateTaskValidator> {
        if (Object.keys(data).length === 0)
            return [errorMessages.NO_PROPERTIES_PROVIDED_WHEN_UPDATE('task'), null];

        const user = new UpdateTaskValidator();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(UpdateTaskValidator, user)];
    }
}