import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/constants/user.constants';
import { UserDataGenerator } from 'src/generators/user.generator';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { ResetPasswordValidator } from 'src/validators/models/user/reset-password.validator';

const resetPasswordValidator = new ResetPasswordValidator();
const seed = new UserDataGenerator();

describe('ResetPasswordValidator', () => {
    describe('Valid password', () => {
        test('return ResetPasswordValidatorInstance', async () => {
            await expect(
                resetPasswordValidator.validate({ password: seed.password() }),
            ).resolves.toBeInstanceOf(ResetPasswordValidator);
        });
    });

    describe('No password provided', () => {
        test('throw InvalidInputError PASSWORD_NOT_PROVIDED', async () => {
            await expect(resetPasswordValidator.validate({} as any)).rejects.toThrow(
                new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED),
            );
        });
    });

    describe('No object provided', () => {
        test('throw InvalidInputError PASSWORD_NOT_PROVIDED', async () => {
            await expect(resetPasswordValidator.validate()) // NOTHING
                .rejects.toThrow(new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED));
        });
    });

    describe('Invalid password min length', () => {
        test('throw InvalidInputError INVALID_PASSWORD_LENGTH', async () => {
            await expect(
                resetPasswordValidator.validate({
                    password: faker.internet.password({
                        length: usersLimits.MIN_PASSWORD_LENGTH - 1,
                    }),
                }),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
        });
    });

    describe('Invalid password max length', () => {
        test('throw InvalidInputError INVALID_PASSWORD_LENGTH', async () => {
            await expect(
                resetPasswordValidator.validate({
                    password: faker.internet.password({
                        length: usersLimits.MAX_PASSWORD_LENGTH + 1,
                    }),
                }),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
        });
    });
});
