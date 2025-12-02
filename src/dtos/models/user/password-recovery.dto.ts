import { CreateUserDto } from './create-user.dto';
import { PickType } from '@nestjs/mapped-types';
import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';

export class PasswordRecoveryDto extends PickType(CreateUserDto, ['email'] as const) {
    static async validate(data: object): Promise<PasswordRecoveryDto> {
        return await validateAndTransformDto(PasswordRecoveryDto, data);
    }
}
