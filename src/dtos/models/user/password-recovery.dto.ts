import { CreateUserDto } from './create-user.dto';
import { PickType } from '@nestjs/mapped-types';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class PasswordRecoveryDto extends PickType(CreateUserDto, ['email'] as const) {
    static async validate(data: Record<string, unknown>): Promise<PasswordRecoveryDto> {
        return await parseAndValidateOrThrow(PasswordRecoveryDto, data);
    }
}
