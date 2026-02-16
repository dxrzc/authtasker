import { PasswordReauthenticationDto } from 'src/dtos/models/user/password-reauthentication.dto';
import { userConstraints } from 'src/constraints/user.constraints';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { authErrors } from 'src/messages/auth.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';

describe('PasswordReauthenticationDto', () => {
    const generator = new UserDataGenerator();
    let validData: typeof generator.user;

    beforeEach(() => {
        validData = generator.user;
    });

    it('should validate valid data', async () => {
        const result = await PasswordReauthenticationDto.validate({ password: validData.password });
        expect(result).toBeInstanceOf(PasswordReauthenticationDto);
        expect(result.password).toBe(validData.password);
    });

    it('should throw if password is missing', async () => {
        const data = { password: undefined };
        await expect(PasswordReauthenticationDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED),
        );
    });

    it('should throw if password is too short', async () => {
        const data = { password: 'a'.repeat(userConstraints.MIN_PASSWORD_LENGTH - 1) };
        await expect(PasswordReauthenticationDto.validate(data)).rejects.toThrow(
            new InvalidInputError(authErrors.INVALID_CREDENTIALS),
        );
    });

    it('should throw if password is too long', async () => {
        const data = { password: 'a'.repeat(userConstraints.MAX_PASSWORD_LENGTH + 1) };
        await expect(PasswordReauthenticationDto.validate(data)).rejects.toThrow(
            new InvalidInputError(authErrors.INVALID_CREDENTIALS),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { password: validData.password, extra: 'property' };
        await expect(PasswordReauthenticationDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
