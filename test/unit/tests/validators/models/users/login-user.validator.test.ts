import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/common/constants/user.constants';
import { UserDataGenerator } from 'src/seed/generators/user.generator';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';
import { authErrors } from 'src/common/errors/messages/auth.error.messages';

const usersData = new UserDataGenerator();
const loginUserValidator = new LoginUserValidator();

describe('LoginUserValidator', () => {
    describe('invalid email', () => {
        test.concurrent('throw InvalidInputError INVALID_CREDENTIALS if email is missing', async () => {
            const data = { password: usersData.password() };

            await expect(async () => await loginUserValidator.validate(data))
                .rejects
                .toThrow(new InvalidInputError(authErrors.INVALID_CREDENTIALS));
        });

        test.concurrent('throw InvalidInputError INVALID_CREDENTIALS if email format is invalid', async () => {
            const data = { email: 'not-an-email', password: usersData.password() };

            await expect(async () => await loginUserValidator.validate(data))
                .rejects
                .toThrow(new InvalidInputError(authErrors.INVALID_CREDENTIALS));
        });
    });

    describe('invalid password', () => {
        test.concurrent('throw InvalidInputError INVALID_CREDENTIALS if password is missing', async () => {
            const data = { email: usersData.email() };

            await expect(async () => await loginUserValidator.validate(data))
                .rejects
                .toThrow(new InvalidInputError(authErrors.INVALID_CREDENTIALS));
        });

        test.concurrent('throw InvalidInputError INVALID_CREDENTIALS if password is too short', async () => {
            const data = {
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
            };

            await expect(async () => await loginUserValidator.validate(data))
                .rejects
                .toThrow(new InvalidInputError(authErrors.INVALID_CREDENTIALS));
        });

        test.concurrent('throw InvalidInputError INVALID_CREDENTIALS if password is too long', async () => {
            const data = {
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
            };

            await expect(async () => await loginUserValidator.validate(data))
                .rejects
                .toThrow(new InvalidInputError(authErrors.INVALID_CREDENTIALS));
        });
    });

    describe('valid input', () => {
        test.concurrent('return LoginUserValidator instance on valid input', async () => {
            const data = {
                email: usersData.email(),
                password: usersData.password(),
            };

            const result = await loginUserValidator.validate(data);
            expect(result).toBeInstanceOf(LoginUserValidator);
        });

        test.concurrent('email and password match input', async () => {
            const data = {
                email: usersData.email(),
                password: usersData.password(),
            };

            const result = await loginUserValidator.validate(data);
            expect(result.email).toBe(data.email);
            expect(result.password).toBe(data.password);
        });
    });
});
