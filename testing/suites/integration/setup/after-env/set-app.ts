import { testKit } from '@integration/kit/test.kit';
import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStorageStore } from 'src/interfaces/others/async-local-storage.interface';
import { AppRoutes } from 'src/routes/app.routes';
import { Server } from 'src/server/server.init';
import { TasksDataGenerator } from 'src/generators/tasks.generator';
import { UserDataGenerator } from 'src/generators/user.generator';
import { ModelLoader } from 'src/models/model.loader';
import { ConfigService } from 'src/services/config.service';

beforeAll(() => {
    const configSvc = new ConfigService();
    testKit.configService = configSvc;
    const appRoutes = new AppRoutes(
        configSvc,
        testKit.loggerServiceMock,
        new AsyncLocalStorage<IAsyncLocalStorageStore>(),
        testKit.redisService,
    );
    const server = new Server(
        testKit.configService.PORT,
        appRoutes.routes,
        testKit.loggerServiceMock,
    );
    testKit.taskData = new TasksDataGenerator();
    testKit.userData = new UserDataGenerator();
    testKit.models = new ModelLoader({ emitEvents: false });
    testKit.jwtBlacklistService = appRoutes['services']['jwtBlacklistService'];
    testKit.hashingService = appRoutes['services']['hashingService'];
    testKit.refreshTokenService = appRoutes['services']['refreshTokenService'];
    testKit.passwordRecoveryTokenService = appRoutes['services']['passwordRecoveryTokenService'];
    testKit.emailValidationTokenService = appRoutes['services']['emailValidationTokenService'];
    testKit.sessionTokenService = appRoutes['services']['sessionTokenService'];
    testKit.refreshJwt = testKit.refreshTokenService['jwtService'];
    testKit.sessionJwt = testKit.sessionTokenService['jwtService'];
    testKit.server = server['app'];
    testKit.server.set('trust proxy', 'loopback'); // Trust only loopback proxies
});
