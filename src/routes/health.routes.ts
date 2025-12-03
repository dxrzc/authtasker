import { Router } from 'express';
import { HealthController } from 'src/controllers/health.controller';
import { UserRole } from 'src/enums/user-role.enum';
import { RolesMiddleware } from 'src/middlewares/roles.middleware';
import { SystemLoggerService } from 'src/services/system-logger.service';

export class HealthRoutes {
    private readonly healthController: HealthController;

    constructor(private readonly rolesMiddleware: RolesMiddleware) {
        this.healthController = new HealthController();
        SystemLoggerService.info('Health routes loaded');
    }

    get routes(): Router {
        const router = Router();
        router.get(
            '/health',
            this.rolesMiddleware.middleware(UserRole.ADMIN),
            this.healthController.getServerHealth,
        );
        return router;
    }
}
