import { Transform } from 'class-transformer';
import { userConstraints } from 'src/constraints/user.constraints';
import { toLowerCaseAndTrim } from 'src/dtos/helpers/to-lowercase.helper';
import { IsDefined, IsEmail, MaxLength, MinLength } from 'class-validator';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class CreateUserDto {
    @IsDefined({ message: usersApiErrors.NAME_NOT_PROVIDED })
    @MinLength(userConstraints.MIN_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    @MaxLength(userConstraints.MAX_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    @Transform(toLowerCaseAndTrim)
    readonly name!: string;

    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, { message: usersApiErrors.INVALID_EMAIL })
    readonly email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(userConstraints.MIN_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    @MaxLength(userConstraints.MAX_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    readonly password!: string;

    static async validateAndTransform(data: Record<string, unknown>): Promise<CreateUserDto> {
        return await parseAndValidateOrThrow(CreateUserDto, data);
    }
}
