import { validate } from 'class-validator';
import { PartialType } from '@nestjs/mapped-types';
import { plainToInstance } from 'class-transformer';
import { CreateUserDto } from './create-user.dto';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';

export class UpdateUserDto extends PartialType(CreateUserDto) {
    static async validateNewAndTransform(data: object): Promise<UpdateUserDto> {
        if (Object.keys(data).length === 0)
            throw new InvalidInputError(usersApiErrors.NO_PROPERTIES_TO_UPDATE);

        const user = new UpdateUserDto();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(returnFirstError(errors));

        return plainToInstance(UpdateUserDto, user);
    }
}
