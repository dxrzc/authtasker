import { faker } from '@faker-js/faker/';
import { usersApiErrors, commonErrors } from '@root/common/errors/messages';
import { UpdateUserValidator } from '@root/validators/models/user';
import { UserDataGenerator } from '@root/seed/generators';
import { usersLimits } from '@root/common/constants';

const usersData = new UserDataGenerator();
const updateUserValidator = new UpdateUserValidator();

describe('UpdateUserValidator', () => {
    test.concurrent('return error if all fields are missing', async () => {
        const [error, _] = await updateUserValidator.validateNewProperties({});
        expect(error).toBe(usersApiErrors.NO_PROPERTIES_TO_UPDATE);
    });

    test.concurrent('return error if name is too short', async () => {
        const data = { name: 'ab' };
        const [error, _] = await updateUserValidator.validateNewProperties(data);
        expect(error).toBe(usersApiErrors.INVALID_NAME_LENGTH);
    });

    test.concurrent('return error if name is too long', async () => {
        const data = { name: faker.string.alpha(usersLimits.MAX_NAME_LENGTH + 1) };
        const [error, _] = await updateUserValidator.validateNewProperties(data);
        expect(error).toBe(usersApiErrors.INVALID_NAME_LENGTH);
    });

    test.concurrent('return error if email format is invalid', async () => {
        const data = { email: 'not-an-email' };
        const [error, _] = await updateUserValidator.validateNewProperties(data);
        expect(error).toBe(usersApiErrors.INVALID_EMAIL);
    });

    test.concurrent('return error if password is too short', async () => {
        const data = {
            password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
        };
        const [error, _] = await updateUserValidator.validateNewProperties(data);
        expect(error).toBe(usersApiErrors.INVALID_PASSWORD_LENGTH);
    });

    test.concurrent('return error if password is too long', async () => {
        const data = {
            password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
        };
        const [error, _] = await updateUserValidator.validateNewProperties(data);
        expect(error).toBe(usersApiErrors.INVALID_PASSWORD_LENGTH);
    });

    test.concurrent('return error when unexpected property is provided', async () => {
        const data = {
            name: usersData.name(),
            email: usersData.email(),
            unknown: 'surprise',
        };
        const [error, _] = await updateUserValidator.validateNewProperties(data);
        expect(error).toBe(commonErrors.UNEXPECTED_PROPERTY_PROVIDED);
    });

    describe('valid input', () => {
        test.concurrent('return UpdateUserValidator instance and null error', async () => {
            const data = { name: usersData.name() };
            const [error, result] = await updateUserValidator.validateNewProperties(data);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(UpdateUserValidator);
        });

        test.concurrent('transform name to lowercase and trim', async () => {
            const nameRaw = ` ${faker.string.alpha(usersLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `;
            const data = { name: nameRaw };
            const [_, result] = await updateUserValidator.validateNewProperties(data);
            expect(result?.name).toBe(nameRaw.trim().toLowerCase());
        });

        test.concurrent('return all other properties unchanged', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: usersData.password(),
            };
            const [_, result] = await updateUserValidator.validateNewProperties(data);
            expect(result?.email).toBe(data.email);
            expect(result?.password).toBe(data.password);
        });
    });
});
