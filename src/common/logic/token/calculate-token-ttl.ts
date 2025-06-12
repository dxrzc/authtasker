
export const calculateTokenTTL = (expiresAtUnixSeconds: number) => {
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const remainingTokenTTLInSeconds = expiresAtUnixSeconds - currentTimeInSeconds;
    return remainingTokenTTLInSeconds;
}