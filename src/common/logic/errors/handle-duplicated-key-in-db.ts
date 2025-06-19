import { Apis } from '@root/enums/apis.enum';
import { LoggerService } from '@root/services/logger.service';
import { HttpError } from '@root/common/errors/classes/http-error.class';
import { tasksApiErrors } from '@root/common/errors/messages/tasks-api.error.messages';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';

export const handleDuplicatedKeyInDb = (api: Apis, error: { keyValue: string }, loggerService: LoggerService) => {
    // - keyValue: {name: 'user123'}
    const duplicatedKey = Object.keys(error.keyValue);
    const keyValue = Object.values(error.keyValue);
    switch (api) {
        case Apis.users: {
            loggerService.error(`User with ${duplicatedKey} "${keyValue}" already exists`);
            throw HttpError.conflict(usersApiErrors.USER_ALREADY_EXISTS);
        }
        case Apis.tasks: {
            loggerService.error(`Task with ${duplicatedKey}: "${keyValue}" already exists`);
            throw HttpError.conflict(tasksApiErrors.taskAlreadyExists(duplicatedKey[0]));
        }
    }
}