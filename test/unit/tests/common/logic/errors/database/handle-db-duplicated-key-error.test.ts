import { mock } from "jest-mock-extended";
import { LoggerService } from "@root/services";
import { handleDbDuplicatedKeyError } from "@logic/errors/database";
import { HttpError } from "@root/rules/errors/http.error";

describe('handleDbDuplicatedKeyError', () => {
    const loggerService = mock<LoggerService>();

    test('throw Http error CONFLICT with duplicated property and value', async () => {
        const duplicatedProperty = 'email';
        const duplicatedValue = 'testEmail';
        const mongooseError = {
            errorResponse: {/* ... */ },
            index: 0,
            code: 11000,
            keyPattern: { name: 1 },
            keyValue: { [duplicatedProperty]: duplicatedValue }
        };

        try {
            handleDbDuplicatedKeyError(mongooseError, loggerService);
        } catch (error: any) {
            expect(error).toBeInstanceOf(HttpError);
            expect(error.message).toEqual(expect.stringContaining(duplicatedProperty));
            expect(error.message).toEqual(expect.stringContaining(duplicatedValue));
            expect(error.statusCode).toBe(409);
        }
    });

    test('logger error is called with the error message', async () => {
        const duplicatedProperty = 'email';
        const duplicatedValue = 'testEmail';
        const mongooseError = {
            errorResponse: {/* ... */ },
            index: 0,
            code: 11000,
            keyPattern: { name: 1 },
            keyValue: { [duplicatedProperty]: duplicatedValue }
        };

        expect(() => handleDbDuplicatedKeyError(mongooseError, loggerService))
            .toThrow();

        expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining(duplicatedProperty));
        expect(loggerService.error).toHaveBeenCalledWith(expect.stringContaining(duplicatedValue));
    });
}); 