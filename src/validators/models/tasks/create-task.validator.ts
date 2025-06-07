import { IsDefined, IsIn, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { Exact } from "@root/types/shared/exact.type";
import { TaskRequest, TasksPriority, tasksPriority, TasksStatus, tasksStatus } from "@root/types/tasks";
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { ValidationResult } from '@root/validators/types';
import { validationOptionsConfig } from '@root/validators/config';
import { returnFirstError } from '@root/validators/helpers';
import { descriptionBadLengthErr, descriptionMaxLength, descriptionMinLength, descriptionMissingErr, nameBadLengthErr, nameMaxLength, nameMinLength, nameMissingErr, priorityNotInErr, statusNotInErr } from '@root/validators/errors/task.errors';

export class CreateTaskValidator implements Exact<CreateTaskValidator, TaskRequest> {

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

    static async validateAndTransform(data: object): ValidationResult<CreateTaskValidator> {
        const task = new CreateTaskValidator();
        Object.assign(task, data);

        const errors = await validate(task, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), null];

        return [null, plainToInstance(CreateTaskValidator, task)];
    }
}