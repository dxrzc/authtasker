
export const makeEmailValidationBlacklistKey = (jti: string) => {
    return `jwt:blacklist:email_validation:${jti}`;
}