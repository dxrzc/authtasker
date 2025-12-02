import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { validationOptionsConfig } from 'src/dtos/config/validation.config';
import { returnFirstError } from 'src/dtos/helpers/return-first-error.helper';

export async function validateAndTransformDto<T extends object>(
    cls: new () => T,
    data: object,
): Promise<T> {
    const instance = plainToInstance(cls, data);
    const errors = await validate(instance, validationOptionsConfig);
    if (errors.length > 0) {
        throw new InvalidInputError(returnFirstError(errors));
    }
    return instance;
}
