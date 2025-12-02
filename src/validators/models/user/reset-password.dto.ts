import { validate } from 'class-validator';
import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { InvalidInputError } from 'src/errors/invalid-input-error.class';

export class ResetPasswordDto extends PickType(CreateUserDto, ['password'] as const) {
    static async validate(input: { password: string } = {} as any): Promise<ResetPasswordDto> {
        const data = new ResetPasswordDto();
        data.password = input.password;
        const errors = await validate(data, validationOptionsConfig);
        if (errors.length > 0) throw new InvalidInputError(returnFirstError(errors));

        return data;
    }
}
