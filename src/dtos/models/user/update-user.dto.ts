import { PartialType } from '@nestjs/mapped-types';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { validateDto } from 'src/functions/dtos/validate-dto';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    static async validateAndTransform(data: object): Promise<UpdateUserDto> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(usersApiErrors.NO_PROPERTIES_TO_UPDATE);
        const validatedData = await validateDto(UpdateUserDto, data);
        return plainToInstance(UpdateUserDto, validatedData);
    }
}
