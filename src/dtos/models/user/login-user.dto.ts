import { userConstraints } from 'src/constraints/user.constraints';
import { IsDefined, IsEmail, MaxLength, MinLength } from 'class-validator';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class LoginUserDto {
    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, {
        message: JSON.stringify({ credentialsError: usersApiErrors.INVALID_EMAIL }),
    })
    readonly email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(userConstraints.MIN_PASSWORD_LENGTH, {
        message: JSON.stringify({ credentialsError: usersApiErrors.INVALID_PASSWORD_LENGTH }),
    })
    @MaxLength(userConstraints.MAX_PASSWORD_LENGTH, {
        message: JSON.stringify({ credentialsError: usersApiErrors.INVALID_PASSWORD_LENGTH }),
    })
    readonly password!: string;

    static async validate(data: Record<string, unknown>): Promise<LoginUserDto> {
        return await parseAndValidateOrThrow(LoginUserDto, data);
    }
}
