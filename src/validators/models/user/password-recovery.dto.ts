import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { CreateUserDto } from './create-user.dto';
import { PickType } from '@nestjs/mapped-types';
import { validate } from 'class-validator';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';

export class PasswordRecoveryDto extends PickType(CreateUserDto, ['email'] as const) {
    static async validate(data: object): Promise<PasswordRecoveryDto> {
        const user = new PasswordRecoveryDto();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(returnFirstError(errors));
        return user;
    }
}
