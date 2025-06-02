import { HttpError } from "@root/rules/errors/http.error";
import { LoggerService } from "@root/services";

export function handleDbDuplicatedKeyError(error: any, loggerService: LoggerService): never {
    const duplicatedKey = Object.keys(error.keyValue);
    const keyValue = Object.values(error.keyValue);
    const message = `User with ${duplicatedKey} "${keyValue}" already exists`;
    loggerService.error(message);
    throw HttpError.conflict(message);
}