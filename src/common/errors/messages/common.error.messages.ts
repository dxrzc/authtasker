
export const errorMessages = {
    FORBIDDEN: 'You do not have permission to perform this action',
    INTERNAL_SERVER_ERROR: 'Internal server error',
    INVALID_TOKEN: 'Invalid token',
    INVALID_CREDENTIALS: 'Invalid credentials',

    PROPERTY_NOT_PROVIDED: (property: string) => `Property "${property}" is required`,    
    PROPERTY_BAD_LENGTH: (property: string, minLength: number, maxLength: number) =>
        `Property "${property}" must be between ${minLength} and ${maxLength} characters`,
    PROPERTY_NOT_IN: (property: string, allowedProperties: string[]) =>
        `Property "${property}" must be one of the following values: ${allowedProperties.join(', ')}`
};