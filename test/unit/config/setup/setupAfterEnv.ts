import { SystemLoggerService } from '@root/services/system-logger.service';

beforeEach(() => {
    // disable info logs before every single test
    jest.spyOn(SystemLoggerService, 'info')
        .mockImplementation();
})