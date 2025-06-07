import { tasksLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { tasksPriority, tasksStatus } from '@root/types/tasks';

export const nameMinLength = tasksLimits.MIN_NAME_LENGTH;
export const nameMaxLength = tasksLimits.MAX_NAME_LENGTH;
export const descriptionMinLength = tasksLimits.MIN_DESCRIPTION_LENGTH;
export const descriptionMaxLength = tasksLimits.MAX_DESCRIPTION_LENGTH;
export const nameMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('name');
export const descriptionMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('description');
export const statusNotInErr = errorMessages.PROPERTY_NOT_IN('status', <any>tasksStatus);
export const priorityNotInErr = errorMessages.PROPERTY_NOT_IN('priority', <any>tasksPriority);
export const nameBadLengthErr = errorMessages.PROPERTY_BAD_LENGTH(
    'name',
    nameMinLength,
    nameMaxLength
);
export const descriptionBadLengthErr = errorMessages.PROPERTY_BAD_LENGTH(
    'description',
    descriptionMinLength,
    descriptionMaxLength
);