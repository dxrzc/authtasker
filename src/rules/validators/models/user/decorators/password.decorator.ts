import {
    registerDecorator,
    ValidationOptions,
    ValidationArguments,    
    isString, maxLength,
    minLength
} from 'class-validator';
import { missingPropertyMssg } from '../../../messages/missing-property.message';
import { USER_VALIDATION_CONSTANTS } from '../../../../constants/user.constants';
import { maxLengthErrorMessage } from '../../../messages/max-length-error.message';
import { minLengthErrorMessage } from '../../../messages/min-length-error.message';

export function Password(validationOptions?: ValidationOptions & { optional: boolean }) {
    return function (object: Object, propertyName: string) {
        registerDecorator({
            name: 'user-password',
            target: object.constructor,
            propertyName: propertyName,
            options: validationOptions,
            validator: {
                validate(value: string | undefined, args: ValidationArguments) {
                    const maxLengthExpected = USER_VALIDATION_CONSTANTS.MAX_PASSWORD_LENGTH;
                    const minLengthExpected = USER_VALIDATION_CONSTANTS.MIN_PASSWORD_LENGTH;

                    if (value) {
                        if (!isString(value))
                            throw new Error('password must be an string');

                        if (!maxLength(value, maxLengthExpected))
                            throw new Error(maxLengthErrorMessage('password', maxLengthExpected));

                        if (!minLength(value, minLengthExpected))
                            throw new Error(minLengthErrorMessage('password', minLengthExpected));

                    } else {
                        if (!validationOptions?.optional)
                            throw new Error(missingPropertyMssg('password'));
                    }

                    return true;
                },
            },
        });
    };
}