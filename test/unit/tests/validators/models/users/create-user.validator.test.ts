import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/common/constants/user.constants';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';
import { usersApiErrors } from 'src/common/errors/messages/users-api.error.messages';
import { UserDataGenerator } from 'src/seed/generators/user.generator';
import { CreateUserValidator } from 'src/validators/models/user/create-user.validator';

const createUserValidator = new CreateUserValidator();
const usersData = new UserDataGenerator();

describe('CreateUserValidator', () => {
    describe('invalid name', () => {
        test.concurrent('throw InvalidInputError with custom message if too short', async () => {
            const data = {
                name: 'ab',
                email: usersData.email(),
                password: usersData.password(),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH));
        });

        test.concurrent('throw InvalidInputError with custom message if too long', async () => {
            const data = {
                name: faker.string.alpha(usersLimits.MAX_NAME_LENGTH + 1),
                email: usersData.email(),
                password: usersData.password(),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH));
        });

        test.concurrent('throw InvalidInputError with custom message if missing', async () => {
            const data = {
                email: usersData.email(),
                password: usersData.password(),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.NAME_NOT_PROVIDED));
        });
    });

    describe('invalid email', () => {
        test.concurrent('throw InvalidInputError with custom message if missing', async () => {
            const data = {
                name: usersData.name(),
                password: usersData.password(),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.EMAIL_NOT_PROVIDED));
        });

        test.concurrent(
            'throw InvalidInputError with custom message if invalid format',
            async () => {
                const data = {
                    name: usersData.name(),
                    email: 'not-an-email',
                    password: usersData.password(),
                };
                await expect(
                    async () => await createUserValidator.validateAndTransform(data),
                ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_EMAIL));
            },
        );
    });

    describe('invalid password', () => {
        test.concurrent('throw InvalidInputError with custom message if too short', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
        });

        test.concurrent('throw InvalidInputError with custom message if too long', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
        });

        test.concurrent('throw InvalidInputError with custom message if missing', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
            };
            await expect(
                async () => await createUserValidator.validateAndTransform(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED));
        });
    });

    describe('valid input', () => {
        test.concurrent('return CreateUserValidator instance', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: usersData.password(),
            };
            const result = await createUserValidator.validateAndTransform(data);
            expect(result).toBeInstanceOf(CreateUserValidator);
        });

        test.concurrent('transform name to lowercase and trim it', async () => {
            const data = {
                name: ` ${faker.string.alpha(usersLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
                email: usersData.email(),
                password: usersData.password(),
            };
            const result = await createUserValidator.validateAndTransform(data);
            expect(result.name).toBe(data.name.toLowerCase().trim());
        });

        test.concurrent('return all other properties unchanged', async () => {
            const name = usersData.name();
            const email = usersData.email();
            const password = usersData.password();
            const data = { name, email, password };

            const result = await createUserValidator.validateAndTransform(data);
            expect(result.email).toBe(email);
            expect(result.password).toBe(password);
        });
    });
});
