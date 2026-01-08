import { authErrors } from 'src/messages/auth.error.messages';
import { commonErrors } from 'src/messages/common.error.messages';

export class InvalidInputError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class InvalidCredentialsError extends InvalidInputError {
    constructor(public readonly actualError: string) {
        super(authErrors.INVALID_CREDENTIALS);
    }
}

export class MaliciousInputError extends InvalidInputError {
    constructor(public readonly reason: string) {
        super(commonErrors.INVALID_INPUT);
    }
}
