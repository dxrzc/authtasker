import { validateDto } from 'src/functions/dtos/validate-dto';
import { usersLimits } from 'src/constants/user.constants';
import { IsDefined, IsEmail, MaxLength, MinLength } from 'class-validator';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { authErrors } from 'src/messages/auth.error.messages';

export class LoginUserDto {
    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, { message: authErrors.INVALID_CREDENTIALS })
    email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH, { message: authErrors.INVALID_CREDENTIALS })
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH, { message: authErrors.INVALID_CREDENTIALS })
    password!: string;

    static async validate(data: object): Promise<LoginUserDto> {
        return await validateDto(LoginUserDto, data);
    }
}
