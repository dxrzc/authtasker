
export const makePasswordRecoveryTokenBlacklistKey = (jti: string) =>
    `jwt:blacklist:password_recovery:${jti}`;