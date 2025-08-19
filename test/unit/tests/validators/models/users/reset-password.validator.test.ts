import { faker } from '@faker-js/faker/.';
import { usersLimits } from '@root/common/constants/user.constants';
import { UserDataGenerator } from '@root/seed/generators/user.generator';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { InvalidInputError } from '@root/common/errors/classes/invalid-input-error.class';
import { ResetPasswordValidator } from '@root/validators/models/user/reset-password.validator';

const resetPasswordValidator = new ResetPasswordValidator();
const seed = new UserDataGenerator();

describe('ResetPasswordValidator', () => {
    describe('Valid password', () => {
        test.concurrent('return ResetPasswordValidatorInstance', async () => {
            await expect(resetPasswordValidator.validate({ password: seed.password() }))
                .resolves
                .toBeInstanceOf(ResetPasswordValidator);
        });
    });

    describe('No password provided', () => {
        test.concurrent('throw InvalidInputError PASSWORD_NOT_PROVIDED', async () => {
            await expect(resetPasswordValidator.validate({} as any))
                .rejects
                .toThrow(new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED));
        });
    });

    describe('Invalid password min length', () => {
        test.concurrent('throw InvalidInputError INVALID_PASSWORD_LENGTH', async () => {
            await expect(resetPasswordValidator.validate({ password: faker.internet.password({ length: usersLimits.MIN_PASSWORD_LENGTH - 1 }) }))
                .rejects
                .toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
        });
    });

    describe('Invalid password max length', () => {
        test.concurrent('throw InvalidInputError INVALID_PASSWORD_LENGTH', async () => {
            await expect(resetPasswordValidator.validate({ password: faker.internet.password({ length: usersLimits.MAX_PASSWORD_LENGTH + 1 }) }))
                .rejects
                .toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
        });
    });
});