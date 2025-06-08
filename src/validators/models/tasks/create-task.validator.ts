import { IsDefined, IsIn, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { TasksPriority, tasksPriority, TasksStatus, tasksStatus } from "@root/types/tasks";
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { validationOptionsConfig } from '@root/validators/config';
import { returnFirstError } from '@root/validators/helpers';
import { ValidationResult } from '@root/types/validation';
import {
    descriptionBadLengthErr,
    descriptionMaxLength,
    descriptionMinLength,
    descriptionMissingErr,
    nameBadLengthErr,
    nameMaxLength,
    nameMinLength,
    nameMissingErr,
    priorityNotInErr,
    statusNotInErr
} from '@root/validators/errors/task.errors';

export class CreateTaskValidator {

    @IsDefined({ message: nameMissingErr })
    @MinLength(nameMinLength, { message: nameBadLengthErr })
    @MaxLength(nameMaxLength, { message: nameBadLengthErr })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({ message: descriptionMissingErr })
    @MinLength(descriptionMinLength, { message: descriptionBadLengthErr })
    @MaxLength(descriptionMaxLength, { message: descriptionBadLengthErr })
    @Transform(toLowerCaseAndTrim)
    description!: string;

    @IsIn(tasksStatus, { message: statusNotInErr })
    status!: TasksStatus;

    @IsIn(tasksPriority, { message: priorityNotInErr })
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