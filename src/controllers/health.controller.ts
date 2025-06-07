import { Request, Response } from 'express';
import { BaseController } from '@root/common/classes';
import { HTTP_STATUS_CODE } from '@root/rules/constants/http-status-codes.constants';
import { LoggerService } from '@root/services';

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
        res.status(HTTP_STATUS_CODE.OK).json(health);
    });
}