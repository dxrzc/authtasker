import { usersLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { UserDataGenerator } from '@root/seed/generators';
import { LoginUserValidator } from '@root/validators/models/user';

const userData = new UserDataGenerator();

describe('LoginUserValidator', () => {
    describe('valid credentials', () => {
        test.concurrent('passes with valid email and password', async () => {
            const data = {
                email: userData.email(),
                password: userData.password()
            };

            const [error, result] = await LoginUserValidator.validate(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(LoginUserValidator);
            expect(result?.email).toBe(data.email);
            expect(result?.password).toBe(data.password);
        });
    });

    describe('invalid email', () => {
        const invalidEmailErr = errorMessages.INVALID_EMAIL;
        const missingEmailErr = errorMessages.PROPERTY_NOT_PROVIDED('email');

        test.concurrent('fails with missing email', async () => {
            const data = {
                password: userData.password()
            };

            const [error] = await LoginUserValidator.validate(data);
            expect(error).toBe(missingEmailErr);
        });

        test.concurrent('fails with malformed email', async () => {
            const data = {
                email: 'invalid-email',
                password: userData.password()
            };

            const [error] = await LoginUserValidator.validate(data);
            expect(error).toBe(invalidEmailErr);
        });
    });

    describe('invalid password', () => {
        const missingPasswordErr = errorMessages.PROPERTY_NOT_PROVIDED('password');
        const badPasswordLengthErr = errorMessages.PROPERTY_BAD_LENGTH('password',
            usersLimits.MIN_PASSWORD_LENGTH,
            usersLimits.MAX_PASSWORD_LENGTH
        );

        test.concurrent('fails with missing password', async () => {
            const data = {
                email: userData.email()
            };

            const [error] = await LoginUserValidator.validate(data);
            expect(error).toBe(missingPasswordErr);
        });

        test.concurrent('fails with short password', async () => {
            const data = {
                email: userData.email(),
                password: '123'
            };

            const [error] = await LoginUserValidator.validate(data);
            expect(error).toBe(badPasswordLengthErr);
        });

        test.concurrent('fails with long password', async () => {
            const data = {
                email: userData.email(),
                password: 'a'.repeat(65)
            };

            const [error] = await LoginUserValidator.validate(data);
            expect(error).toBe(badPasswordLengthErr);
        });
    });
});
