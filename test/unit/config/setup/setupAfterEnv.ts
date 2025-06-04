import { SystemLoggerService } from '@root/services'

beforeEach(() => {
    // disable info logs before every single test
    jest.spyOn(SystemLoggerService, 'info')
        .mockImplementation();
})