import { faker } from '@faker-js/faker/';
import { LoginUserValidator } from '@root/validators/models/user';
import { usersApiErrors } from '@root/common/errors/messages';
import { UserDataGenerator } from '@root/seed/generators';
import { usersLimits } from '@root/common/constants';

const usersData = new UserDataGenerator();
const loginUserValidator = new LoginUserValidator();

describe('LoginUserValidator', () => {
    describe('invalid email', () => {
        test.concurrent('return error if email is missing', async () => {
            const data = { password: usersData.password() };
            const [error, _] = await loginUserValidator.validate(data);
            expect(error).toBe(usersApiErrors.EMAIL_NOT_PROVIDED);
        });

        test.concurrent('return error if email format is invalid', async () => {
            const data = { email: 'not-an-email', password: usersData.password() };
            const [error, _] = await loginUserValidator.validate(data);
            expect(error).toBe(usersApiErrors.INVALID_EMAIL);
        });
    });

    describe('invalid password', () => {
        test.concurrent('return error if password is missing', async () => {
            const data = { email: usersData.email() };
            const [error, _] = await loginUserValidator.validate(data);
            expect(error).toBe(usersApiErrors.PASSWORD_NOT_PROVIDED);
        });


        test.concurrent('return error if password is too short', async () => {
            const data = {
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
            };
            const [error, _] = await loginUserValidator.validate(data);
            expect(error).toBe(usersApiErrors.INVALID_PASSWORD_LENGTH);
        });

        test.concurrent('return error if password is too long', async () => {
            const data = {
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
            };
            const [error, _] = await loginUserValidator.validate(data);
            expect(error).toBe(usersApiErrors.INVALID_PASSWORD_LENGTH);
        });
    });

    describe('valid input', () => {
        test.concurrent('return LoginUserValidator instance and null error', async () => {
            const data = {
                email: usersData.email(),
                password: usersData.password(),
            };

            const [error, result] = await loginUserValidator.validate(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(LoginUserValidator);
        });

        test.concurrent('email and password match input', async () => {
            const data = {
                email: usersData.email(),
                password: usersData.password(),
            };

            const [_, result] = await loginUserValidator.validate(data);
            expect(result?.email).toBe(data.email);
            expect(result?.password).toBe(data.password);
        });
    });
});
