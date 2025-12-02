import { UpdateUserDto } from 'src/dtos/models/user/update-user.dto';
import { usersLimits } from 'src/constants/user.constants';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { commonErrors } from 'src/messages/common.error.messages';
import { UserDataGenerator } from 'src/generators/user.generator';

describe('UpdateUserDto', () => {
    const generator = new UserDataGenerator();
    let validData: typeof generator.user;

    beforeEach(() => {
        validData = generator.user;
    });

    it('should validate and transform valid data (all fields)', async () => {
        const result = await UpdateUserDto.validateAndTransform(validData);
        expect(result).toBeInstanceOf(UpdateUserDto);
        expect(result.name).toBe(validData.name);
        expect(result.email).toBe(validData.email);
        expect(result.password).toBe(validData.password);
    });

    it('should validate and transform valid data (partial fields)', async () => {
        const partialData = { name: validData.name };
        const result = await UpdateUserDto.validateAndTransform(partialData);
        expect(result).toBeInstanceOf(UpdateUserDto);
        expect(result.name).toBe(validData.name);
        expect(result.email).toBeUndefined();
        expect(result.password).toBeUndefined();
    });

    it('should throw if no properties to update', async () => {
        await expect(UpdateUserDto.validateAndTransform({})).rejects.toThrow(
            new InvalidInputError(usersApiErrors.NO_PROPERTIES_TO_UPDATE),
        );
    });

    it('should trim and lowercase name', async () => {
        const data = { name: '  ' + validData.name.toUpperCase() + '  ' };
        const result = await UpdateUserDto.validateAndTransform(data);
        expect(result.name).toBe(validData.name);
    });

    it('should throw if name is too short', async () => {
        const data = { name: 'a'.repeat(usersLimits.MIN_NAME_LENGTH - 1) };
        await expect(UpdateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if name is too long', async () => {
        const data = { name: 'a'.repeat(usersLimits.MAX_NAME_LENGTH + 1) };
        await expect(UpdateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_NAME_LENGTH),
        );
    });

    it('should throw if email is invalid', async () => {
        const data = { email: 'invalid-email' };
        await expect(UpdateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_EMAIL),
        );
    });

    it('should throw if password is too short', async () => {
        const data = { password: 'a'.repeat(usersLimits.MIN_PASSWORD_LENGTH - 1) };
        await expect(UpdateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH),
        );
    });

    it('should throw if password is too long', async () => {
        const data = { password: 'a'.repeat(usersLimits.MAX_PASSWORD_LENGTH + 1) };
        await expect(UpdateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(usersApiErrors.INVALID_PASSWORD_LENGTH),
        );
    });

    it('should throw if extra properties are provided', async () => {
        const data = { name: validData.name, extra: 'property' };
        await expect(UpdateUserDto.validateAndTransform(data)).rejects.toThrow(
            new InvalidInputError(commonErrors.UNEXPECTED_PROPERTY_PROVIDED),
        );
    });
});
