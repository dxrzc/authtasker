import { readFileSync } from 'fs';

export const readAdminSessionToken = (): string => {
    const path = `${__dirname}/admin-session-token.txt`;
    const token = readFileSync(path, 'utf-8');
    return token;
};
