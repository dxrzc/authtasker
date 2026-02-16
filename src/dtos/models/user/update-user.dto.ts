import { PartialType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    static async validateAndTransform(data: Record<string, unknown>): Promise<UpdateUserDto> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(usersApiErrors.NO_PROPERTIES_TO_UPDATE);
        return await parseAndValidateOrThrow(UpdateUserDto, data);
    }
}
