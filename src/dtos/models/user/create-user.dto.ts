import { Transform } from 'class-transformer';
import { usersLimits } from 'src/constants/user.constants';
import { toLowerCaseAndTrim } from 'src/dtos/helpers/to-lowercase.helper';
import { IsDefined, IsEmail, MaxLength, MinLength } from 'class-validator';
import { usersApiErrors } from 'src/messages/users-api.error.messages';
import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';

export class CreateUserDto {
    @IsDefined({ message: usersApiErrors.NAME_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    @MaxLength(usersLimits.MAX_NAME_LENGTH, { message: usersApiErrors.INVALID_NAME_LENGTH })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({ message: usersApiErrors.EMAIL_NOT_PROVIDED })
    @IsEmail(undefined, { message: usersApiErrors.INVALID_EMAIL })
    email!: string;

    @IsDefined({ message: usersApiErrors.PASSWORD_NOT_PROVIDED })
    @MinLength(usersLimits.MIN_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    @MaxLength(usersLimits.MAX_PASSWORD_LENGTH, { message: usersApiErrors.INVALID_PASSWORD_LENGTH })
    password!: string;

    static async validateAndTransform(data: Record<string, unknown>): Promise<CreateUserDto> {
        return await validateAndTransformDto(CreateUserDto, data);
    }
}
