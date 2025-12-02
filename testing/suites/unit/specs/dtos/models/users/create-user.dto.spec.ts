import { CreateUserDto } from 'src/dtos/models/user/create-user.dto';
import { usersLimits } from 'src/constants/user.constants';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';

describe('CreateUserDto', () => {
    const generator = new UserDataGenerator();
    let validData: typeof generator.user;

    beforeEach(() => {
        validData = generator.user;
    });

    it('should validate and transform valid data', async () => {
        const result = await CreateUserDto.validateAndTransform(validData);
        expect(result).toBeInstanceOf(CreateUserDto);
        expect(result.name).toBe(validData.name);
        expect(result.email).toBe(validData.email);
        expect(result.password).toBe(validData.password);
    });

    it('should trim and lowercase name', async () => {
        const data = { ...validData, name: '  ' + validData.name.toUpperCase() + '  ' };
        const result = await CreateUserDto.validateAndTransform(data);
        expect(result.name).toBe(validData.name);
    });

    it('should throw if name is missing', async () => {
        const data = { ...validData, name: undefined };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.NAME_NOT_PROVIDED),
        );
    });

    it('should throw if name is too short', async () => {
        const data = { ...validData, name: 'a'.repeat(usersLimits.MIN_NAME_LENGTH - 1) };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if name is too long', async () => {
        const data = { ...validData, name: 'a'.repeat(usersLimits.MAX_NAME_LENGTH + 1) };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if email is missing', async () => {
        const data = { ...validData, email: undefined };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.EMAIL_NOT_PROVIDED),
        );
    });

    it('should throw if email is invalid', async () => {
        const data = { ...validData, email: 'invalid-email' };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_EMAIL),
        );
    });

    it('should throw if password is missing', async () => {
        const data = { ...validData, password: undefined };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.PASSWORD_NOT_PROVIDED),
        );
    });

    it('should throw if password is too short', async () => {
        const data = { ...validData, password: 'a'.repeat(usersLimits.MIN_PASSWORD_LENGTH - 1) };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH),
        );
    });

    it('should throw if password is too long', async () => {
        const data = { ...validData, password: 'a'.repeat(usersLimits.MAX_PASSWORD_LENGTH + 1) };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { ...validData, extra: 'property' };
        await expect(CreateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
