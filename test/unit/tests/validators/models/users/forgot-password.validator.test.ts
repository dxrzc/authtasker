import { faker } from '@faker-js/faker/.';
import { usersLimits } from 'src/common/constants/user.constants';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';
import { commonErrors } from 'src/common/errors/messages/common.error.messages';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';
import { UserDataGenerator } from 'src/seed/generators/user.generator';
import { ForgotPasswordValidator } from 'src/validators/models/user/forgot-password.validator';

const forgotPasswordValidator = new ForgotPasswordValidator();
const usersData = new UserDataGenerator();

describe('ForgotPasswordValidator', () => {
    describe('Valid password provided', () => {
        test.concurrent('return ForgotPasswordValidator instance', async () => {
            expect(
                forgotPasswordValidator.validate({ username: usersData.name() }),
            ).resolves.toBeInstanceOf(ForgotPasswordValidator);
        });
    });

    describe('Valid email provided', () => {
        test.concurrent('return ForgotPasswordValidator instance', async () => {
            expect(
                forgotPasswordValidator.validate({ email: usersData.email() }),
            ).resolves.toBeInstanceOf(ForgotPasswordValidator);
        });
    });

    describe('No properties provided', () => {
        test.concurrent('throw InvalidInput INVALID_FORGOT_PASSWORD_INPUT message', async () => {
            await expect(forgotPasswordValidator.validate({})).rejects.toThrow(
                new InvalidInputError(usersApiErrors.INVALID_FORGOT_PASSWORD_INPUT),
            );
        });
    });

    describe('Provided email is not a valid email', () => {
        test.concurrent('throw InvalidInput INVALID_EMAIL  error', async () => {
            await expect(
                forgotPasswordValidator.validate({ email: 'invalid-email' }),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_EMAIL));
        });
    });

    describe('Provided username is too long', () => {
        test.concurrent('throw InvalidInput INVALID_NAME_LENGTH  error', async () => {
            const invalidName = faker.string.alpha({ length: usersLimits.MAX_NAME_LENGTH + 1 });
            await expect(
                forgotPasswordValidator.validate({ username: invalidName }),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH));
        });
    });

    describe('Email and password provided', () => {
        test.concurrent('throw InvalidInput INVALID_FORGOT_PASSWORD_INPUT message', async () => {
            await expect(
                forgotPasswordValidator.validate({
                    username: usersData.name(),
                    email: usersData.email(),
                }),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_FORGOT_PASSWORD_INPUT));
        });
    });

    describe('Unexpected property provided', () => {
        test.concurrent('throw InvalidInput UNEXPECTED_PROPERTY_PROVIDED message', async () => {
            await expect(
                forgotPasswordValidator.validate({
                    sqlInjection: 'DROP DATABASE',
                }),
            ).rejects.toThrow(new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED));
        });
    });
});
