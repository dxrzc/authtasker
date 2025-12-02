import { validate } from 'class-validator';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';

export async function validateDto<T extends object>(cls: new () => T, data: object): Promise<T> {
    const instance = Object.assign(new cls(), data);
    const errors = await validate(instance, validationOptionsConfig);
    if (errors.length > 0) {
        throw new InvalidInputError(returnFirstError(errors));
    }
    return instance;
}
