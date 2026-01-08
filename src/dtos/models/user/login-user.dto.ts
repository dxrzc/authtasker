import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';
import { usersLimits } from 'src/constants/user.constants';
import { IsDefined, IsEmail, MaxLength, MinLength } from 'class-validator';
import { usersApiErrors } from 'src/messages/users-api.error.messages';

export class LoginUserDto {
    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, {
        message: JSON.stringify({ credentialsError: usersApiErrors.INVALID_EMAIL }),
    })
    email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH, {
        message: JSON.stringify({ credentialsError: usersApiErrors.INVALID_PASSWORD_LENGTH }),
    })
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH, {
        message: JSON.stringify({ credentialsError: usersApiErrors.INVALID_PASSWORD_LENGTH }),
    })
    password!: string;

    static async validate(data: Record<string, unknown>): Promise<LoginUserDto> {
        return await validateAndTransformDto(LoginUserDto, data);
    }
}
