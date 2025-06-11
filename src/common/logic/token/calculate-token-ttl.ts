
export const calculateTokenTTL = (tokenExp: number) => {
    const currentTime = Math.floor(Date.now() / 1000);
    const remainingTokenTTL = tokenExp! - currentTime;
    return remainingTokenTTL;
}