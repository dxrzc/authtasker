import { authErrors } from 'src/messages/auth.error.messages';

export class InvalidInputError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidCredentialsInput extends InvalidInputError {
    constructor() {
        super(authErrors.INVALID_CREDENTIALS);
    }
}
