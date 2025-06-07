import { Request, Response } from 'express';
import { LoggerService } from '@root/services';
import { statusCodes } from '@root/common/constants';
import { BaseController } from '@root/common/base';

export class HealthController extends BaseController {

    constructor(private readonly loggerService: LoggerService) {
        super();
    }

    // TODO: logging
    readonly getServerHealth = this.forwardError(async (req: Request, res: Response): Promise<void> => {
        const health = {
            status: 'UP',
            uptime: process.uptime(),
            memoryUsage: process.memoryUsage(),
            cpuUsage: process.cpuUsage(),
            timestamp: new Date(),
        };
        res.status(statusCodes.OK).json(health);
    });
}