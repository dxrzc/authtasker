import { statusCodes } from 'src/constants/status-codes.constants';

export class HttpError extends Error {
    private constructor(
        public readonly statusCode: number,
        public readonly message: string,
    ) {
        super(message);
    }

    static badRequest(message: string) {
        return new HttpError(statusCodes.BAD_REQUEST, message);
    }

    static conflict(message: string) {
        return new HttpError(statusCodes.CONFLICT, message);
    }

    static unAuthorized(message: string) {
        return new HttpError(statusCodes.UNAUTHORIZED, message);
    }

    static forbidden(message: string) {
        return new HttpError(statusCodes.FORBIDDEN, message);
    }

    static notFound(message: string) {
        return new HttpError(statusCodes.NOT_FOUND, message);
    }

    static internalServer(message: string) {
        return new HttpError(statusCodes.INTERNAL_SERVER_ERROR, message);
    }
}
