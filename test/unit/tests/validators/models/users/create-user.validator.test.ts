import { faker } from '@faker-js/faker';
import { usersLimits } from '@root/common/constants/user.constants';
import { usersApiErrors } from '@root/common/errors/messages/users-api.error.messages';
import { UserDataGenerator } from '@root/seed/generators/user.generator';
import { CreateUserValidator } from '@root/validators/models/user/create-user.validator';

const createUserValidator = new CreateUserValidator();
const usersData = new UserDataGenerator();

describe('CreateUserValidator', () => {
    describe('invalid name', () => {
        test.concurrent('return custom error if too short', async () => {
            const data = {
                name: 'ab',
                email: usersData.email(),
                password: usersData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.INVALID_NAME_LENGTH);
        });

        test.concurrent('return custom error if too long', async () => {
            const data = {
                name: faker.string.alpha(usersLimits.MAX_NAME_LENGTH + 1),
                email: usersData.email(),
                password: usersData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.INVALID_NAME_LENGTH);
        });

        test.concurrent('return custom error if missing', async () => {
            const data = {
                email: usersData.email(),
                password: usersData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.NAME_NOT_PROVIDED);
        });
    });

    describe('invalid email', () => {
        test.concurrent('return custom error if missing', async () => {
            const data = {
                name: usersData.name(),
                password: usersData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.EMAIL_NOT_PROVIDED);
        });

        test.concurrent('return custom error if invalid format', async () => {
            const data = {
                name: usersData.name(),
                email: 'not-an-email',
                password: usersData.password(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.INVALID_EMAIL);
        });
    });

    describe('invalid password', () => {
        test.concurrent('return custom error if too short', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.INVALID_PASSWORD_LENGTH);
        });

        test.concurrent('return custom error if too long', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.INVALID_PASSWORD_LENGTH);
        });

        test.concurrent('return custom error if missing', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
            };
            const [error] = await createUserValidator.validateProperties(data);
            expect(error).toBe(usersApiErrors.PASSWORD_NOT_PROVIDED);
        });
    });

    describe('valid input', () => {
        test.concurrent('return CreateUserValidator instance and null error', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: usersData.password(),
            };
            const [error, result] = await createUserValidator.validateProperties(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(CreateUserValidator);
        });

        test.concurrent('transform name to lowercase and trim it', async () => {
            const data = {
                name: ` ${faker.string.alpha(usersLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `,
                email: usersData.email(),
                password: usersData.password(),
            };
            const [_, result] = await createUserValidator.validateProperties(data);            
            expect(result?.name).toBe(data.name.toLowerCase().trim());
        });

        test.concurrent('return all other properties unchanged', async () => {
            const name = usersData.name();
            const email = usersData.email();
            const password = usersData.password();
            const data = { name, email, password };

            const [_, result] = await createUserValidator.validateProperties(data);
            expect(result?.email).toBe(email);
            expect(result?.password).toBe(password);
        });
    });
});
