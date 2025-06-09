import { faker } from '@faker-js/faker';
import { usersLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { UserDataGenerator } from '@root/seed/generators';
import { UNEXPECTED_PROPERTY_PROVIDED } from '@root/validators/errors/common.errors';
import { CreateUserValidator } from '@root/validators/models/user';

const userData = new UserDataGenerator();
const createUserValidator = new CreateUserValidator();

describe('CreateUserValidator', () => {
    describe('name validation', () => {
        const nameMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('name');
        const nameBadLengthErr = errorMessages.PROPERTY_BAD_LENGTH(
            'name',
            usersLimits.MIN_NAME_LENGTH,
            usersLimits.MAX_NAME_LENGTH
        );

        test.concurrent('error if name is missing', async () => {
            const data = {
                email: userData.email(),
                password: userData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(nameMissingErr);
        });

        test.concurrent('error if name too short', async () => {
            const data = {
                name: 'a',
                email: userData.email(),
                password: userData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(nameBadLengthErr);
        });

        test.concurrent('error if name too long', async () => {
            const data = {
                name: faker.string.alpha(96),
                email: userData.email(),
                password: userData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(nameBadLengthErr);
        });
    });

    describe('email validation', () => {
        const emailMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('email');

        test.concurrent('error if email is missing', async () => {
            const data = {
                name: userData.name(),
                password: userData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(emailMissingErr);
        });

        test.concurrent('error if email is invalid', async () => {
            const data = {
                name: userData.name(),
                email: 'invalid-email',
                password: userData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(errorMessages.INVALID_EMAIL);
        });
    });

    describe('password validation', () => {
        const passwordMissingErr = errorMessages.PROPERTY_NOT_PROVIDED('password');
        const passwordBadLengthErr = errorMessages.PROPERTY_BAD_LENGTH(
            'password',
            usersLimits.MIN_PASSWORD_LENGTH,
            usersLimits.MAX_PASSWORD_LENGTH
        );

        test.concurrent('error if password is missing', async () => {
            const data = {
                name: userData.name(),
                email: userData.email(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(passwordMissingErr);
        });

        test.concurrent('error if password too short', async () => {
            const data = {
                name: userData.name(),
                email: userData.email(),
                password: 'abc',
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(passwordBadLengthErr);
        });

        test.concurrent('error if password too long', async () => {
            const data = {
                name: userData.name(),
                email: userData.email(),
                password: faker.string.alpha(100),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(passwordBadLengthErr);
        });
    });

    test.concurrent('return error when unexpected property is provided', async () => {
        const data = {
            name: userData.name(),
            email: userData.email(),
            password: faker.string.alpha(100),
            role: 'admin'
        };
        const [error] = await createUserValidator.validateProperties(data);
        expect(error).toBe(UNEXPECTED_PROPERTY_PROVIDED);
    });

    describe('valid input', () => {
        test.concurrent('return CreateUserValidator instance and null error', async () => {
            const data = {
                name: userData.name(),
                email: userData.email(),
                password: userData.password(),                
            };
            const [error, result] = await createUserValidator.validateProperties(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(CreateUserValidator);            
        });

        test.concurrent('name is transformed to lowercase and trimmed, the rest of the props remain intact', async () => {
            const data = {
                name: ` ${faker.string.alpha(usersLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
                email: userData.email(),
                password: userData.password(),
            };
            const [_, result] = await createUserValidator.validateProperties(data);
            expect(result).toBeDefined();
            expect(result?.name).toBe(data.name.toLowerCase().trim());
            expect(result?.email).toBe(data.email);
            expect(result?.password).toBe(data.password);
        });
    });
});
