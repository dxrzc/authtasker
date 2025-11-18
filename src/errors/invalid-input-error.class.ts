export class InvalidInputError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidCredentialsInput extends InvalidInputError {
    constructor(message: string) {
        super(message);
    }
}
