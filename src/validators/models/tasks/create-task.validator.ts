import { IsDefined, IsIn, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { Exact } from "@root/types/shared/exact.type";
import { TaskRequest, TasksPriority, tasksPriority, TasksStatus, tasksStatus } from "@root/types/tasks";
import { tasksLimits } from '@root/common/constants';
import { errorMessages } from '@root/common/errors/messages';
import { toLowerCaseAndTrim } from '@root/validators/helpers/to-lowercase.helper';
import { ValidationResult } from '@root/validators/types';
import { validationOptionsConfig } from '@root/validators/config';
import { returnFirstError } from '@root/validators/helpers';

export class CreateTaskValidator implements Exact<CreateTaskValidator, TaskRequest> {

    @IsDefined({
        message: errorMessages.PROPERTY_NOT_PROVIDED('name')
    })
    @MinLength(tasksLimits.MIN_NAME_LENGTH, {
        message: errorMessages.PROPERTY_BAD_LENGTH(
            'name',
            tasksLimits.MIN_NAME_LENGTH,
            tasksLimits.MAX_NAME_LENGTH
        )
    })
    @MaxLength(
        tasksLimits.MAX_NAME_LENGTH, {
        message: errorMessages.PROPERTY_BAD_LENGTH(
            'name',
            tasksLimits.MIN_NAME_LENGTH,
            tasksLimits.MAX_NAME_LENGTH
        )
    })
    @Transform(toLowerCaseAndTrim)
    name!: string;

    @IsDefined({
        message: errorMessages.PROPERTY_NOT_PROVIDED('description')
    })
    @MinLength(tasksLimits.MIN_DESCRIPTION_LENGTH, {
        message: errorMessages.PROPERTY_BAD_LENGTH(
            'description',
            tasksLimits.MIN_DESCRIPTION_LENGTH,
            tasksLimits.MAX_DESCRIPTION_LENGTH
        )
    })
    @MaxLength(tasksLimits.MAX_DESCRIPTION_LENGTH, {
        message: errorMessages.PROPERTY_BAD_LENGTH(
            'description',
            tasksLimits.MIN_DESCRIPTION_LENGTH,
            tasksLimits.MAX_DESCRIPTION_LENGTH
        )
    })
    @Transform(toLowerCaseAndTrim)
    description!: string;

    @IsIn(tasksStatus, {
        message: errorMessages.PROPERTY_NOT_IN('status', <any>tasksStatus)
    })
    status!: TasksStatus;

    @IsIn(tasksPriority, {
        message: errorMessages.PROPERTY_NOT_IN('priority', <any>tasksPriority)
    })
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