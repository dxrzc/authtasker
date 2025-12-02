import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { validateDto } from 'src/functions/dtos/validate-dto';

export class ResetPasswordDto extends PickType(CreateUserDto, ['password'] as const) {
    static async validate(data: object): Promise<ResetPasswordDto> {
        return await validateDto(ResetPasswordDto, data);
    }
}
