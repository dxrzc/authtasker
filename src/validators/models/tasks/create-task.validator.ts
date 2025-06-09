import { IsDefined, IsIn, MaxLength, MinLength, validate } from 'class-validator';
import { plainToInstance, Transform } from 'class-transformer';
import { TasksPriority, tasksPriority, TasksStatus, tasksStatus } from '@root/types/tasks';
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { validationOptionsConfig } from '@root/validators/config';
import { returnFirstError } from '@root/validators/helpers';
import { ValidationResult } from '@root/types/validation';
import { tasksApiErrors } from '@root/common/errors/messages';
import { tasksLimits } from '@root/common/constants';

export class CreateTaskValidator {

    @IsDefined({ message: tasksApiErrors.NAME_NOT_PROVIDED })
    @MinLength(tasksLimits.MIN_NAME_LENGTH, { message: tasksApiErrors.INVALID_NAME_LENGTH })
    @MaxLength(tasksLimits.MAX_NAME_LENGTH, { message: tasksApiErrors.INVALID_NAME_LENGTH })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({ message: tasksApiErrors.DESCRIPTION_NOT_PROVIDED })
    @MinLength(tasksLimits.MIN_DESCRIPTION_LENGTH, { message: tasksApiErrors.INVALID_DESCRIPTION_LENGTH })
    @MaxLength(tasksLimits.MAX_DESCRIPTION_LENGTH, { message: tasksApiErrors.INVALID_DESCRIPTION_LENGTH })
    description!: string;

    @IsIn(tasksStatus, { message: tasksApiErrors.INVALID_STATUS })
    status!: TasksStatus;

    @IsIn(tasksPriority, { message: tasksApiErrors.INVALID_PRIORITY })
    priority!: TasksPriority;

    async validateProperties(data: object): ValidationResult<CreateTaskValidator> {
        const task = new CreateTaskValidator();
        Object.assign(task, data);

        const errors = await validate(task, validationOptionsConfig);
        if (errors.length > 0)
            return [returnFirstError(errors), null];
        
        return [null, plainToInstance(CreateTaskValidator, task)];
    }
}