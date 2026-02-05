import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/validate-and-transform';

export class ResetPasswordDto extends PickType(CreateUserDto, ['password'] as const) {
    static async validate(data: Record<string, unknown>): Promise<ResetPasswordDto> {
        return await parseAndValidateOrThrow(ResetPasswordDto, data);
    }
}
