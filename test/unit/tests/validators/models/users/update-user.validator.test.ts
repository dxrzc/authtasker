import { faker } from '@faker-js/faker';
import { errorMessages } from '@root/common/errors/messages';
import { UserDataGenerator } from '@root/seed/generators';
import { UpdateUserValidator } from '@root/validators/models/user';

const userData = new UserDataGenerator();
const updateUserValidator = new UpdateUserValidator();

describe('UpdateUserValidator', () => {
    const noPropsErr = errorMessages.NO_PROPERTIES_PROVIDED_WHEN_UPDATE('user');

    test.concurrent('fails when no properties are provided', async () => {
        const [error, result] = await updateUserValidator.validateNewProperties({});
        expect(error).toBe(noPropsErr);
        expect(result).toBeNull();
    });

    describe('valid partial updates', () => {
        test.concurrent('passes with only valid name', async () => {
            const [error, result] = await updateUserValidator.validateNewProperties({
                name: userData.name()
            });
            expect(error).toBeNull();
            expect(result?.name).toBeDefined();
        });

        test.concurrent('passes with only valid email', async () => {
            const [error, result] = await updateUserValidator.validateNewProperties({
                email: userData.email()
            });
            expect(error).toBeNull();
            expect(result?.email).toBeDefined();
        });

        test.concurrent('passes with only valid password', async () => {
            const [error, result] = await updateUserValidator.validateNewProperties({
                password: userData.password()
            });
            expect(error).toBeNull();
            expect(result?.password).toBeDefined();
        });

        test.concurrent('passes with all valid fields', async () => {
            const validData = {
                name: userData.name(),
                email: userData.email(),
                password: userData.password()
            };
            const [error, result] = await updateUserValidator.validateNewProperties(validData);
            expect(error).toBeNull();
            expect(result).toBeInstanceOf(UpdateUserValidator);
        });
    });

    describe('invalid field updates', () => {
        test.concurrent('fails with invalid email', async () => {
            const [error] = await updateUserValidator.validateNewProperties({
                email: 'invalid-email'
            });
            expect(error).toBe(errorMessages.INVALID_EMAIL);
        });

        test.concurrent('fails with short name', async () => {
            const [error] = await updateUserValidator.validateNewProperties({
                name: 'a'
            });
            expect(error).toMatch(/name/);
        });

        test.concurrent('fails with too long name', async () => {
            const [error] = await updateUserValidator.validateNewProperties({
                name: faker.string.alpha(50)
            });
            expect(error).toMatch(/name/);
        });

        test.concurrent('fails with too short password', async () => {
            const [error] = await updateUserValidator.validateNewProperties({
                password: '123'
            });
            expect(error).toMatch(/password/);
        });
    });
});
