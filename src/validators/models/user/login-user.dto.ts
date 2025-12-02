import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { InvalidCredentialsInput } from 'src/errors/invalid-input-error.class';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';

export class LoginUserDto extends PickType(CreateUserDto, ['email', 'password'] as const) {
    static async validate(data: object): Promise<LoginUserDto> {
        const user = new LoginUserDto();
        Object.assign(user, data);

        const errors = await validate(user, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidCredentialsInput(returnFirstError(errors));

        return user;
    }
}
