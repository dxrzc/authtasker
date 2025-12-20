import { PickType } from '@nestjs/mapped-types';
import { CreateUserDto } from './create-user.dto';
import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';

export class ResetPasswordDto extends PickType(CreateUserDto, ['password'] as const) {
    static async validate(data: Record<string, unknown>): Promise<ResetPasswordDto> {
        return await validateAndTransformDto(ResetPasswordDto, data);
    }
}
