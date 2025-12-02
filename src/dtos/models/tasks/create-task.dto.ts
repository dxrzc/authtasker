import { plainToInstance, Transform } from 'class-transformer';
import { tasksLimits } from 'src/constants/tasks.constants';
import { TasksStatus, tasksStatus } from 'src/types/tasks/task-status.type';
import { toLowerCaseAndTrim } from 'src/dtos/helpers/to-lowercase.helper';
import { IsDefined, IsIn, MaxLength, MinLength } from 'class-validator';
import { tasksPriority, TasksPriority } from 'src/types/tasks/task-priority.type';
import { tasksApiErrors } from 'src/messages/tasks-api.error.messages';
import { validateDto } from 'src/functions/dtos/validate-dto';

export class CreateTaskDto {
    @IsDefined({ message: tasksApiErrors.NAME_NOT_PROVIDED })
    @MinLength(tasksLimits.MIN_NAME_LENGTH, { message: tasksApiErrors.INVALID_NAME_LENGTH })
    @MaxLength(tasksLimits.MAX_NAME_LENGTH, { message: tasksApiErrors.INVALID_NAME_LENGTH })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({ message: tasksApiErrors.DESCRIPTION_NOT_PROVIDED })
    @MinLength(tasksLimits.MIN_DESCRIPTION_LENGTH, {
        message: tasksApiErrors.INVALID_DESCRIPTION_LENGTH,
    })
    @MaxLength(tasksLimits.MAX_DESCRIPTION_LENGTH, {
        message: tasksApiErrors.INVALID_DESCRIPTION_LENGTH,
    })
    description!: string;

    @IsDefined({ message: tasksApiErrors.STATUS_NOT_PROVIDED })
    @IsIn(tasksStatus, { message: tasksApiErrors.INVALID_STATUS })
    status!: TasksStatus;

    @IsDefined({ message: tasksApiErrors.PRIORITY_NOT_PROVIDED })
    @IsIn(tasksPriority, { message: tasksApiErrors.INVALID_PRIORITY })
    priority!: TasksPriority;

    static async validateAndTransform(data: object): Promise<CreateTaskDto> {
        const validatedData = await validateDto(CreateTaskDto, data);
        return plainToInstance(CreateTaskDto, validatedData);
    }
}
