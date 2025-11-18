import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';
import { PasswordRecoveryValidator } from 'src/validators/models/user/password-recovery.validator';

const passwordRecoveryValidator = new PasswordRecoveryValidator();
const usersData = new UserDataGenerator();

describe('PasswordRecoveryValidator', () => {
    describe('invalid email', () => {
        test('throw InvalidInputError with custom message if missing', async () => {
            const data = {};
            await expect(
                async () => await passwordRecoveryValidator.validate(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.EMAIL_NOT_PROVIDED));
        });

        test('throw InvalidInputError with custom message if invalid format', async () => {
            const data = {
                email: 'not-an-email',
            };
            await expect(
                async () => await passwordRecoveryValidator.validate(data),
            ).rejects.toThrow(new InvalidInputError(usersApiErrors.INVALID_EMAIL));
        });
    });

    describe('valid input', () => {
        test('return PasswordRecoveryValidator instance', async () => {
            const data = {
                email: usersData.email,
            };
            const result = await passwordRecoveryValidator.validate(data);
            expect(result).toBeInstanceOf(PasswordRecoveryValidator);
        });

        test('return email property unchanged', async () => {
            const email = usersData.email;
            const data = { email };

            const result = await passwordRecoveryValidator.validate(data);
            expect(result.email).toBe(email);
        });
    });
});
