import { Apis } from '@root/enums/apis.enum';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { handleDuplicatedKeyInDb } from '@logic/errors/handle-duplicated-key-in-db';
import { tasksApiErrors } from '@root/common/errors/messages/tasks-api.error.messages';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

describe('handleDuplicatedKeyInDb', () => {
    describe('Users API', () => {
        test('throw HttpError CONFLICT and USER_ALREADY_EXISTS message', async () => {
            expect(() => handleDuplicatedKeyInDb(
                Apis.users,
                { keyValue: '...' }, // error
                { error: jest.fn() } as any // loggerService
            ))
                .toThrow(HttpError.conflict(usersApiErrors.USER_ALREADY_EXISTS))
        });
    });

    describe('Tasks API', () => {
        test('throw HttpError CONFLICT and the message containing the duplicated key', async () => {
            const duplicatedKey = 'name';
            const error = {
                keyValue: { [duplicatedKey]: 'duplicated-value' }
            };
            expect(() => handleDuplicatedKeyInDb(
                Apis.tasks,
                error,
                { error: jest.fn() } as any // loggerService
            ))
                .toThrow(HttpError.conflict(tasksApiErrors.taskAlreadyExists(duplicatedKey)))
        });
    });
});