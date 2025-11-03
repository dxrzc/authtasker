import { plainToInstance, Transform } from 'class-transformer';
import { tasksLimits } from 'src/common/constants/tasks.constants';
import { TasksStatus, tasksStatus } from 'src/types/tasks/task-status.type';
import { toLowerCaseAndTrim } from 'src/validators/helpers/to-lowercase.helper';
import { IsDefined, IsIn, MaxLength, MinLength, validate } from 'class-validator';
import { tasksPriority, TasksPriority } from 'src/types/tasks/task-priority.type';
import { validationOptionsConfig } from 'src/validators/config/validation.config';
import { returnFirstError } from 'src/validators/helpers/return-first-error.helper';
import { tasksApiErrors } from 'src/common/errors/messages/tasks-api.error.messages';
import { InvalidInputError } from 'src/common/errors/classes/invalid-input-error.class';

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

    async validateAndTransform(data: object): Promise<CreateTaskValidator> {
        const task = new CreateTaskValidator();
        Object.assign(task, data);

        const errors = await validate(task, validationOptionsConfig);
        if (errors.length > 0)
            throw new InvalidInputError(returnFirstError(errors));
        
        return plainToInstance(CreateTaskValidator, task)
    }
}