import { commonErrors } from '@root/common/errors/messages';
import { ValidationError } from "class-validator";

export const returnFirstError = (errors: ValidationError[]): string => {    
    const firstOne = errors.at(0);
    if (!firstOne || !firstOne.constraints)
        throw new Error('Can not identify the properties validation error');
    const errs = Object.values<string>(firstOne.constraints);    
    // Use a custom error when a unexpected property is found in body
    if (Object.keys(firstOne.constraints).includes('whitelistValidation'))
        errs[0] = commonErrors.UNEXPECTED_PROPERTY_PROVIDED;
    return errs[0];
};