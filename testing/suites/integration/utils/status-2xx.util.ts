import { Response } from 'express';

export const status2xx = (res: Response) => {
    if (res.statusCode < 200 || res.statusCode >= 300) {
        throw new Error(`Expected status code to be 2xx, got ${res.statusCode}`);
    }
};
