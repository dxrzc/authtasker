import { SystemLoggerService } from 'src/services/system-logger.service';

export function disableSystemErrorLogsForThisTest() {
    jest.spyOn(SystemLoggerService, 'error').mockImplementationOnce(() => {});
}
