
export const makeRefreshTokenKey = (userId: string, jti: string) => `jwt:${userId}:refresh:${jti}`;