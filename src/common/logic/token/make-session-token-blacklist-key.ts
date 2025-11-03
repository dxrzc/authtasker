export const makeSessionTokenBlacklistKey = (jti: string): string => {
    return `jwt:blacklist:session:${jti}`;
};
