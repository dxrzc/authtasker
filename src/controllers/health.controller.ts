import { Request, Response } from 'express';
import { statusCodes } from 'src/constants/status-codes.constants';

export class HealthController {
    constructor() {}

    readonly getServerHealth = (req: Request, res: Response): void => {
        const health = {
            status: 'UP',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            timestamp: new Date(),
        };
        res.status(statusCodes.OK).json(health);
    };
}
