import { testKit } from '@integration/kit/test.kit';
import { AsyncLocalStorage } from 'async_hooks';
import { IAsyncLocalStorageStore } from 'src/interfaces/others/async-local-storage.interface';
import { AppRoutes } from 'src/routes/app.routes';
import { Server } from 'src/server/server.init';

beforeAll(() => {
    const appRoutes = new AppRoutes(
        testKit.configService,
        testKit.loggerServiceMock,
        new AsyncLocalStorage<IAsyncLocalStorageStore>(),
        testKit.redisService,
    );
    const server = new Server(
        testKit.configService.PORT,
        appRoutes.routes,
        testKit.loggerServiceMock,
    );
    testKit.server = server['app'];
    testKit.server.set('trust proxy', 'loopback'); // Trust only loopback proxies
});
