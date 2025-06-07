import { ValidationError } from "class-validator";

export const returnFirstError = (errors: ValidationError[]): string => {
    const firstOne = errors.at(0);
    if (!firstOne || !firstOne.constraints)
        throw new Error('Can not identify the properties validation error');
    const errs = Object.values<string>(firstOne.constraints)
    return errs[0];
};