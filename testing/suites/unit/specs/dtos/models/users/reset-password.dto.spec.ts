import { ResetPasswordDto } from 'src/dtos/models/user/reset-password.dto';
import { usersLimits } from 'src/constants/user.constants';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError, MaliciousInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';

describe('ResetPasswordDto', () => {
    const generator = new UserDataGenerator();
    let validData: typeof generator.user;

    beforeEach(() => {
        validData = generator.user;
    });

    it('should validate valid data', async () => {
        const result = await ResetPasswordDto.validate({ password: validData.password });
        expect(result).toBeInstanceOf(ResetPasswordDto);
        expect(result.password).toBe(validData.password);
    });

    it('should throw if password is missing', async () => {
        const data = { password: undefined };
        await expect(ResetPasswordDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED),
        );
    });

    it('should throw if password is too short', async () => {
        const data = { password: 'a'.repeat(usersLimits.MIN_PASSWORD_LENGTH - 1) };
        await expect(ResetPasswordDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH),
        );
    });

    it('should throw if password is too long', async () => {
        const data = { password: 'a'.repeat(usersLimits.MAX_PASSWORD_LENGTH + 1) };
        await expect(ResetPasswordDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { password: validData.password, extra: 'property' };
        await expect(ResetPasswordDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });

    it('should throw MaliciousInputError if password contains malicious content', async () => {
        const data = { password: '<script>alert("XSS")</script>' };
        await expect(ResetPasswordDto.validate(data)).rejects.toThrow(MaliciousInputError);
    });
});
