
export const errorMessages = {
    FORBIDDEN: 'You do not have permission to perform this action',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    INVALID_TOKEN: 'Invalid token',
    INVALID_CREDENTIALS: 'Invalid credentials',
    INVALID_EMAIL: 'Invalid email format',
    INVALID_PAG_PAGE: 'Invalid page',
    INVALID_PAG_LIMIT: 'Invalid limit',
    PAG_PAGE_TOO_LARGE: 'Page is too large',
    PAG_LIMIT_TOO_LARGE: 'Limit is too large',

    PROPERTY_NOT_PROVIDED: (property: string) => `Property "${property}" is required`,
    PROPERTY_BAD_LENGTH: (property: string, minLength: number, maxLength: number) =>
        `Property "${property}" must be between ${minLength} and ${maxLength} characters`,
    PROPERTY_NOT_IN: (property: string, allowedProperties: string[]) =>
        `Property "${property}" must be one of the following values: ${allowedProperties.join(', ')}`,
    NO_PROPERTIES_PROVIDED_WHEN_UPDATE: (modelName: 'user' | 'task') =>
        `At least one property is required to update the ${modelName}`,
};