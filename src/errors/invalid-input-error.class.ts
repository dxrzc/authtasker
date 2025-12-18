import { commonErrors } from 'src/messages/common.error.messages';

export class InvalidInputError extends Error {
    constructor(message: string) {
        super(message);
    }
}

export class MaliciousInputError extends InvalidInputError {
    constructor(public readonly reason: string) {
        super(commonErrors.INVALID_INPUT);
    }
}
