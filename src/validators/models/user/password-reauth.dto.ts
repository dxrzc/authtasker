import { PickType } from '@nestjs/mapped-types';
import { validate } from 'class-validator';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { LoginUserDto } from './login-user.dto';

export class PasswordReAuthDTO extends PickType(LoginUserDto, ['password'] as const) {
    static async validate(data: object): Promise<PasswordReAuthDTO> {
        const user = new PasswordReAuthDTO();
        Object.assign(user, data);
        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(returnFirstError(errors));
        return user;
    }
}
