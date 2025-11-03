import { Request, Response } from 'express';
import { BaseController } from 'src/common/base/base-controller.class';
import { statusCodes } from 'src/common/constants/status-codes.constants';

export class HealthController extends BaseController {

    constructor() {
        super();
    }

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