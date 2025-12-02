import { PasswordRecoveryDto } from 'src/dtos/models/user/password-recovery.dto';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';

describe('PasswordRecoveryDto', () => {
    const generator = new UserDataGenerator();
    let validData: typeof generator.user;

    beforeEach(() => {
        validData = generator.user;
    });

    it('should validate valid data', async () => {
        const result = await PasswordRecoveryDto.validate({ email: validData.email });
        expect(result).toBeInstanceOf(PasswordRecoveryDto);
        expect(result.email).toBe(validData.email);
    });

    it('should throw if email is missing', async () => {
        const data = { email: undefined };
        await expect(PasswordRecoveryDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.EMAIL_NOT_PROVIDED),
        );
    });

    it('should throw if email is invalid', async () => {
        const data = { email: 'invalid-email' };
        await expect(PasswordRecoveryDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_EMAIL),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { email: validData.email, extra: 'property' };
        await expect(PasswordRecoveryDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
