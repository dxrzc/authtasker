import { faker } from '@faker-js/faker';
import { usersLimits } from 'src/constants/user.constants';
import { UserDataGenerator } from 'src/generators/user.generator';
import { commonErrors } from 'src/messages/common.error.messages';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { UpdateUserValidator } from 'src/validators/models/user/update-user.validator';

const usersData = new UserDataGenerator();
const updateUserValidator = new UpdateUserValidator();

describe('UpdateUserValidator', () => {
    test('throw InvalidInputError if all fields are missing', async () => {
        await expect(
            async () => await updateUserValidator.validateNewAndTransform({}),
        ).rejects.toThrow(new InvalidInputError(usersApiErrors.NO_PROPERTIES_TO_UPDATE));
    });

    test('throw InvalidInputError if name is too short', async () => {
        const data = { name: 'ab' };
        await expect(
            async () => await updateUserValidator.validateNewAndTransform(data),
        ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH));
    });

    test('throw InvalidInputError if name is too long', async () => {
        const data = { name: faker.string.alpha(usersLimits.MAX_NAME_LENGTH + 1) };
        await expect(
            async () => await updateUserValidator.validateNewAndTransform(data),
        ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH));
    });

    test('throw InvalidInputError if email format is invalid', async () => {
        const data = { email: 'not-an-email' };
        await expect(
            async () => await updateUserValidator.validateNewAndTransform(data),
        ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_EMAIL));
    });

    test('throw InvalidInputError if password is too short', async () => {
        const data = {
            password: faker.string.alpha(usersLimits.MIN_PASSWORD_LENGTH - 1),
        };
        await expect(
            async () => await updateUserValidator.validateNewAndTransform(data),
        ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
    });

    test('throw InvalidInputError if password is too long', async () => {
        const data = {
            password: faker.string.alpha(usersLimits.MAX_PASSWORD_LENGTH + 1),
        };
        await expect(
            async () => await updateUserValidator.validateNewAndTransform(data),
        ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH));
    });

    test('throw InvalidInputError when unexpected property is provided', async () => {
        const data = {
            name: usersData.name(),
            email: usersData.email(),
            unknown: 'surprise',
        };
        await expect(
            async () => await updateUserValidator.validateNewAndTransform(data),
        ).rejects.toThrow(new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED));
    });

    describe('valid input', () => {
        test('return UpdateUserValidator instance', async () => {
            const data = { name: usersData.name() };
            const result = await updateUserValidator.validateNewAndTransform(data);
            expect(result).toBeInstanceOf(UpdateUserValidator);
        });

        test('transform name to lowercase and trim', async () => {
            const nameRaw = ` ${faker.string.alpha(usersLimits.MAX_NAME_LENGTH - 2).toUpperCase()} `;
            const data = { name: nameRaw };
            const result = await updateUserValidator.validateNewAndTransform(data);
            expect(result.name).toBe(nameRaw.trim().toLowerCase());
        });

        test('return all other properties unchanged', async () => {
            const data = {
                name: usersData.name(),
                email: usersData.email(),
                password: usersData.password(),
            };
            const result = await updateUserValidator.validateNewAndTransform(data);
            expect(result.email).toBe(data.email);
            expect(result.password).toBe(data.password);
        });
    });
});
