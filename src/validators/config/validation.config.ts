/* Keep forbidNonWhitelisted to true in order to avoid Prototype Pollution Attacks
when using Object.assign */
export const validationOptionsConfig = {
    whitelist: true,
    forbidNonWhitelisted: true,
    validationError: { target: false },
    stopAtFirstError: true,
} as const;