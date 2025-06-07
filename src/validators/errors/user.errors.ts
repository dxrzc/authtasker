import { usersLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';

export const nameMinLength = usersLimits.MIN_NAME_LENGTH;
export const nameMaxLength = usersLimits.MAX_NAME_LENGTH;
export const passwordMinLength = usersLimits.MIN_PASSWORD_LENGTH;
export const passwordMaxLength = usersLimits.MAX_PASSWORD_LENGTH;
export const nameMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('name');
export const passwordMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('password');
export const emailMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('email');
export const nameBadLengthErr = errorMessages.PROPERTY_BAD_LENGTH(
    'name',
    nameMinLength,
    nameMaxLength
);
export const passwordBadLengthErr = errorMessages.PROPERTY_BAD_LENGTH(
    'password',
    passwordMinLength,
    passwordMaxLength
);