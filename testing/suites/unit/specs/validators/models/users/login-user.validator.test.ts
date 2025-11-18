import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/constants/user.constants';
import { UserDataGenerator } from 'src/generators/user.generator';
import { LoginUserValidator } from 'src/validators/models/user/login-user.validator';
import { InvalidCredentialsInput } from 'src/errors/invalid-input-error.class';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

const usersData = new UserDataGenerator();
const loginUserValidator = new LoginUserValidator();

describe('LoginUserValidator', () => {
    describe('invalid email', () => {
        test('throw InvalidCredentialsInput with custom message if missing', async () => {
            const data = {
                password: usersData.password,
            };
            await expect(async () => await loginUserValidator.validate(data)).rejects.toThrow(
                new InvalidCredentialsInput(usersApiErrors.EMAIL_NOT_PROVIDED),
            );
        });

        test('throw InvalidCredentialsInput with custom message if invalid format', async () => {
            const data = {
                email: 'not-an-email',
                password: usersData.password,
            };
            await expect(async () => await loginUserValidator.validate(data)).rejects.toThrow(
                new InvalidCredentialsInput(usersApiErrors.INVALID_EMAIL),
            );
        });
    });

    describe('invalid password', () => {
        test('throw InvalidCredentialsInput with custom message if too short', async () => {
            const data = {
                email: usersData.email,
                password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
            };
            await expect(async () => await loginUserValidator.validate(data)).rejects.toThrow(
                new InvalidCredentialsInput(usersApiErrors.INVALID_PASSWORD_LENGTH),
            );
        });

        test('throw InvalidCredentialsInput with custom message if too long', async () => {
            const data = {
                email: usersData.email,
                password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
            };
            await expect(async () => await loginUserValidator.validate(data)).rejects.toThrow(
                new InvalidCredentialsInput(usersApiErrors.INVALID_PASSWORD_LENGTH),
            );
        });

        test('throw InvalidCredentialsInput with custom message if missing', async () => {
            const data = {
                email: usersData.email,
            };
            await expect(async () => await loginUserValidator.validate(data)).rejects.toThrow(
                new InvalidCredentialsInput(usersApiErrors.PASSWORD_NOT_PROVIDED),
            );
        });
    });

    describe('valid input', () => {
        test('return LoginUserValidator instance', async () => {
            const data = {
                email: usersData.email,
                password: usersData.password,
            };
            const result = await loginUserValidator.validate(data);
            expect(result).toBeInstanceOf(LoginUserValidator);
        });

        test('return all properties unchanged', async () => {
            const email = usersData.email;
            const password = usersData.password;
            const data = { email, password };

            const result = await loginUserValidator.validate(data);
            expect(result.email).toBe(email);
            expect(result.password).toBe(password);
        });
    });
});
