import { LoginUserDto } from 'src/dtos/models/user/login-user.dto';
import { usersLimits } from 'src/constants/user.constants';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { authErrors } from 'src/messages/auth.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';

describe('LoginUserDto', () => {
    const generator = new UserDataGenerator();
    let validData: Pick<typeof generator.user, 'email' | 'password'>;

    beforeEach(() => {
        const fullUser = generator.user;
        validData = {
            email: fullUser.email,
            password: fullUser.password,
        };
    });

    it('should validate valid data', async () => {
        const result = await LoginUserDto.validate(validData);
        expect(result).toBeInstanceOf(LoginUserDto);
        expect(result.email).toBe(validData.email);
        expect(result.password).toBe(validData.password);
    });

    it('should throw if email is missing', async () => {
        const data = { ...validData, email: undefined };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.EMAIL_NOT_PROVIDED),
        );
    });

    it('should throw if email is invalid', async () => {
        const data = { ...validData, email: 'invalid-email' };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(authErrors.INVALID_CREDENTIALS),
        );
    });

    it('should throw if password is missing', async () => {
        const data = { ...validData, password: undefined };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED),
        );
    });

    it('should throw if password is too short', async () => {
        const data = { ...validData, password: 'a'.repeat(usersLimits.MIN_PASSWORD_LENGTH - 1) };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(authErrors.INVALID_CREDENTIALS),
        );
    });

    it('should throw if password is too long', async () => {
        const data = { ...validData, password: 'a'.repeat(usersLimits.MAX_PASSWORD_LENGTH + 1) };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(authErrors.INVALID_CREDENTIALS),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { ...validData, extra: 'property' };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
