import { PickType } from '@nestjs/mapped-types';
import { LoginUserDto } from './login-user.dto';
import { validateDto } from 'src/functions/dtos/validate-dto';

export class PasswordReauthenticationDto extends PickType(LoginUserDto, ['password'] as const) {
    static async validate(data: object): Promise<PasswordReauthenticationDto> {
        const validatedData = await validateDto(PasswordReauthenticationDto, data);
        return validatedData;
    }
}
