
export class HttpError extends Error {

    private constructor(
        public readonly statusCode: number,
        public readonly message: string,
    ) {
        super(message);
    }

    static badRequest(message: string) {
        return new HttpError(400, message);
    }

    static conflict(message: string) {
        return new HttpError(409, message);
    }

    static unAuthorized(message: string) {
        return new HttpError(401, message);
    }

    static forbidden(message: string) {
        return new HttpError(403, message);
    }

    static notFound(message: string) {
        return new HttpError(404, message);
    }

    static internalServer(message: string) {
        return new HttpError(500, message);
    }
}