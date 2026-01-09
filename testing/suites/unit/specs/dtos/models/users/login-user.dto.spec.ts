import { LoginUserDto } from 'src/dtos/models/user/login-user.dto';
import { usersLimits } from 'src/constants/user.constants';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import {
    InvalidCredentialsError,
    InvalidInputError,
    MaliciousInputError,
} from 'src/errors/invalid-input-error.class';
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

    it('should throw InvalidCredentialsError when email is invalid and expose actual error', async () => {
        const data = { ...validData, email: 'invalid-email' };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(InvalidCredentialsError);
        await expect(LoginUserDto.validate(data)).rejects.toHaveProperty(
            'actualError',
            usersApiErrors.INVALID_EMAIL,
        );
    });

    it('should throw if password is missing', async () => {
        const data = { ...validData, password: undefined };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED),
        );
    });

    it('should throw InvalidCredentialsError when password is too short and expose actual error', async () => {
        const data = { ...validData, password: 'a'.repeat(usersLimits.MIN_PASSWORD_LENGTH - 1) };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(InvalidCredentialsError);
        await expect(LoginUserDto.validate(data)).rejects.toHaveProperty(
            'actualError',
            usersApiErrors.INVALID_PASSWORD_LENGTH,
        );
    });

    it('should throw InvalidCredentialsError when password is too long and expose actual error', async () => {
        const data = { ...validData, password: 'a'.repeat(usersLimits.MAX_PASSWORD_LENGTH + 1) };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(InvalidCredentialsError);
        await expect(LoginUserDto.validate(data)).rejects.toHaveProperty(
            'actualError',
            usersApiErrors.INVALID_PASSWORD_LENGTH,
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { ...validData, extra: 'property' };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });

    it('should throw MaliciousInputError if email contains malicious content', async () => {
        const data = { ...validData, email: '<script>alert("XSS")</script>' };
        await expect(LoginUserDto.validate(data)).rejects.toThrow(MaliciousInputError);
    });
});
