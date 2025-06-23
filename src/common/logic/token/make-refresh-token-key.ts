
export const makeRefreshTokenKey = (jti: string) => `token:refresh:${jti}`;