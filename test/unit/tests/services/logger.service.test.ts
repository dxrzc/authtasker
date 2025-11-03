import { mock } from 'jest-mock-extended';
import winston from 'winston';
import { AsyncLocalStorage } from 'async_hooks';
import { ConfigService } from 'src/services/config.service';
import { LoggerService } from 'src/services/logger.service';
import { NoReadonly } from '@unit/utils/types/no-read-only.type';

describe('LoggerService ', () => {
    let configService: NoReadonly<ConfigService>;
    let loggerService: LoggerService;
    let consoleLogger = mock<winston.Logger>();
    let fileLogger = mock<winston.Logger>();
    let requestCompletedFileLogger = mock<winston.Logger>();
    beforeEach(() => {
        configService = {} as any;
        loggerService = new LoggerService(configService, new AsyncLocalStorage<any>());
        loggerService['consoleLogger'] = consoleLogger;
        loggerService['requestCompletedFileLogger'] = requestCompletedFileLogger;
        loggerService['fileLogger'] = fileLogger;
    });

    describe('log (private)', () => {
        describe('HTTP_LOGS env is true', () => {
            test('consoleLogger.log and httpMessageFileLogger.log should be called', async () => {
                configService.HTTP_LOGS = true;
                loggerService['log']('info', 'test-message');
                expect(consoleLogger.log).toHaveBeenCalledTimes(1);
                expect(fileLogger.log).toHaveBeenCalledTimes(1);
            });
        });

        describe('HTTP_LOGS env is false', () => {
            test('consoleLogger.log and httpMessageFileLogger.log should NOT be called', async () => {
                configService.HTTP_LOGS = false;
                loggerService['log']('info', 'test-message');
                expect(consoleLogger.log).not.toHaveBeenCalled();
                expect(fileLogger.log).not.toHaveBeenCalled();
            });
        });
    });

    describe('logRequest', () => {
        describe('HTTP_LOGS env is true', () => {
            test('consoleLogger.log and requestCompletedFileLogger.info should be called', async () => {
                configService.HTTP_LOGS = true;
                loggerService.logRequest({} as any);
                expect(consoleLogger.log).toHaveBeenCalledTimes(1);
                expect(requestCompletedFileLogger.info).toHaveBeenCalledTimes(1);
            });
        });

        describe('HTTP_LOGS env is false', () => {
            test('consoleLogger.log and requestCompletedFileLogger.info should NOT be called', async () => {
                configService.HTTP_LOGS = false;
                loggerService.logRequest({} as any);
                expect(consoleLogger.log).not.toHaveBeenCalled();
                expect(requestCompletedFileLogger.info).not.toHaveBeenCalled();
            });
        });
    });

    describe('error', () => {
        test('stack trace is included in logging in fs', async () => {
            configService.HTTP_LOGS = true;
            const stackTrace = 'here';
            loggerService.error('error', stackTrace);
            expect(fileLogger.log).toHaveBeenCalledWith(expect.objectContaining({ stackTrace }));
        });
    });
});
