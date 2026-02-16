import { PickType } from '@nestjs/mapped-types';
import { LoginUserDto } from './login-user.dto';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class PasswordReauthenticationDto extends PickType(LoginUserDto, ['password'] as const) {
    static async validate(data: Record<string, unknown>): Promise<PasswordReauthenticationDto> {
        const validatedData = await parseAndValidateOrThrow(PasswordReauthenticationDto, data);
        return validatedData;
    }
}
