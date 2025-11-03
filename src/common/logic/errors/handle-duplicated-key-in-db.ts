import { Apis } from 'src/enums/apis.enum';
import { LoggerService } from 'src/services/logger.service';
import { HttpError } from 'src/common/errors/classes/http-error.class';
import { tasksApiErrors } from 'src/common/errors/messages/tasks-api.error.messages';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';

export const handleDuplicatedKeyInDb = (
    api: Apis,
    error: { keyValue: any },
    loggerService: LoggerService,
) => {
    // - keyValue: {name: 'user123'}
    const duplicatedKey = Object.keys(error.keyValue);
    const keyValue = Object.values(error.keyValue);
    switch (api) {
        case Apis.users: {
            loggerService.error(
                `User with ${duplicatedKey.join(', ')} "${keyValue.join(', ')}" already exists`,
            );
            throw HttpError.conflict(usersApiErrors.USER_ALREADY_EXISTS);
        }
        case Apis.tasks: {
            loggerService.error(
                `Task with ${duplicatedKey.join(', ')}: "${keyValue.join(', ')}" already exists`,
            );
            throw HttpError.conflict(tasksApiErrors.taskAlreadyExists(duplicatedKey[0]));
        }
    }
};
