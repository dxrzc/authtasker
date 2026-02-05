import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import { InvalidCredentialsError, InvalidInputError } from 'src/errors/invalid-input-error.class';
import { validationOptionsConfig } from 'src/dtos/config/validation.config';
import { returnFirstError } from 'src/dtos/helpers/return-first-error.helper';

export async function validateAndTransformDto<T extends object>(
    cls: new () => T,
    data: Record<string, unknown>,
): Promise<T> {
    const instance = plainToInstance(cls, data);
    const errors = await validate(instance, validationOptionsConfig);
    if (errors.length > 0) {
        const validationError = returnFirstError(errors);
        try {
            // Credentials error come in a stringified object
            const parsedError = JSON.parse(validationError) as { credentialsError: string };
            throw new InvalidCredentialsError(parsedError.credentialsError);
        } catch (error) {
            // Re-throw credentials errors
            if (error instanceof InvalidCredentialsError) {
                throw error;
            }
            // Non-sensible validation errors (JSON.parse failed)
            throw new InvalidInputError(validationError);
        }
    }
    return instance;
}
