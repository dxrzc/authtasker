import { Transform } from 'class-transformer';
import { tasksLimits } from 'src/constants/tasks.constants';
import { TasksStatus, tasksStatus } from 'src/types/tasks/task-status.type';
import { toLowerCaseAndTrim } from 'src/dtos/helpers/to-lowercase.helper';
import { IsDefined, IsIn, MaxLength, MinLength } from 'class-validator';
import { tasksPriority, TasksPriority } from 'src/types/tasks/task-priority.type';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/validate-and-transform';

export class CreateTaskDto {
    @IsDefined({ message: tasksApiErrors.NAME_NOT_PROVIDED })
    @MinLength(tasksLimits.MIN_NAME_LENGTH, { message: tasksApiErrors.INVALID_NAME_LENGTH })
    @MaxLength(tasksLimits.MAX_NAME_LENGTH, { message: tasksApiErrors.INVALID_NAME_LENGTH })
    @Transform(toLowerCaseAndTrim)
    readonly name!: string;

    @IsDefined({ message: tasksApiErrors.DESCRIPTION_NOT_PROVIDED })
    @MinLength(tasksLimits.MIN_DESCRIPTION_LENGTH, {
        message: tasksApiErrors.INVALID_DESCRIPTION_LENGTH,
    })
    @MaxLength(tasksLimits.MAX_DESCRIPTION_LENGTH, {
        message: tasksApiErrors.INVALID_DESCRIPTION_LENGTH,
    })
    readonly description!: string;

    @IsDefined({ message: tasksApiErrors.STATUS_NOT_PROVIDED })
    @IsIn(tasksStatus, { message: tasksApiErrors.INVALID_STATUS })
    readonly status!: TasksStatus;

    @IsDefined({ message: tasksApiErrors.PRIORITY_NOT_PROVIDED })
    @IsIn(tasksPriority, { message: tasksApiErrors.INVALID_PRIORITY })
    readonly priority!: TasksPriority;

    static async validateAndTransform(data: Record<string, unknown>): Promise<CreateTaskDto> {
        return await parseAndValidateOrThrow(CreateTaskDto, data);
    }
}
