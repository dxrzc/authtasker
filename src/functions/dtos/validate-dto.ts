import { validate } from 'class-validator';
import { plainToInstance } from 'class-transformer';
import {
    InvalidCredentialsError,
    InvalidInputError,
    MaliciousInputError,
} from 'src/errors/invalid-input-error.class';
import { validationOptionsConfig } from 'src/dtos/config/validation.config';
import { returnFirstError } from 'src/dtos/helpers/return-first-error.helper';
import sanitizeHtml from 'sanitize-html';

export async function validateAndTransformDto<T extends object>(
    cls: new () => T,
    data: Record<string, unknown>,
): Promise<T> {
    // prevent XSS
    for (const key in data) {
        if (typeof data[key] === 'string') {
            const sanitized = sanitizeHtml(data[key], {
                allowedTags: [],
                allowedAttributes: {},
            });
            if (sanitized !== data[key]) {
                throw new MaliciousInputError(`Malicious content detected in property "${key}".`);
            }
        }
    }
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
