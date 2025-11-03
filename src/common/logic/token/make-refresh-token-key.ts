// Make sure to also change the redis suscriber event if you change this function!
export const makeRefreshTokenKey = (userId: string, jti: string) => `jwt:refresh:${userId}:${jti}`;
