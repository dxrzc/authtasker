export const usersApiErrors = {
    // db
    NOT_FOUND: 'User not found',
    ALREADY_EXISTS: 'User already exists',
    EMAIL_ALREADY_VERIFIED: 'User email already verified',
    // validation
    INVALID_NAME_LENGTH: 'Invalid name length',
    INVALID_EMAIL_LENGTH: 'Invalid email length',
    INVALID_PASSWORD_LENGTH: 'Invalid password length',
    INVALID_EMAIL: 'Invalid email format',
    NAME_NOT_PROVIDED: 'Name not provided',
    EMAIL_NOT_PROVIDED: 'Email not provided',
    PASSWORD_NOT_PROVIDED: 'Password not provided',
    NO_PROPERTIES_TO_UPDATE: 'No properties to update',
    INVALID_FORGOT_PASSWORD_INPUT: 'A credential is required, either email or username',
};
