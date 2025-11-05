import { Apis } from 'src/enums/apis.enum';
import { HttpError } from 'src/errors/http-error.class';
import { handleDuplicatedKeyInDb } from 'src/functions/errors/handle-duplicated-key-in-db';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

describe('handleDuplicatedKeyInDb', () => {
    describe('Users API', () => {
        test('throw HttpError CONFLICT and USER_ALREADY_EXISTS message', () => {
            expect(() =>
                handleDuplicatedKeyInDb(
                    Apis.users,
                    { keyValue: '...' }, // error
                    { error: jest.fn() } as any, // loggerService
                ),
            ).toThrow(HttpError.conflict(usersApiErrors.ALREADY_EXISTS));
        });
    });

    describe('Tasks API', () => {
        test('throw HttpError CONFLICT and TASK_ALREADY_EXISTS message', () => {
            const duplicatedKey = 'name';
            const error = {
                keyValue: { [duplicatedKey]: 'duplicated-value' },
            };
            expect(() =>
                handleDuplicatedKeyInDb(
                    Apis.tasks,
                    error,
                    { error: jest.fn() } as any, // loggerService
                ),
            ).toThrow(HttpError.conflict(tasksApiErrors.ALREADY_EXISTS));
        });
    });
});
