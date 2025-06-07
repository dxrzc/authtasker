import { IsDefined, IsIn, IsString, MaxLength, MinLength, validate } from "class-validator";
import { plainToInstance, Transform } from "class-transformer";
import { Exact } from "@root/types/shared/exact.type";
import { returnFirstError } from "../../helpers/return-first-error.helper";
import { TaskRequest, TasksPriority, tasksPriority, TasksStatus, tasksStatus } from "@root/types/tasks";
import { toLowerCase } from "../../helpers/to-lowercase.helper";
import { validationOptionsConfig } from "../../config/validation.config";
import { ValidationResult } from "../../types/validation-result.type";
import { tasksLimits } from '@root/common/constants';

export class CreateTaskValidator implements Exact<CreateTaskValidator, TaskRequest> {

    @IsDefined()
    @MinLength(tasksLimits.MIN_NAME_LENGTH)
    @MaxLength(tasksLimits.MAX_NAME_LENGTH)
    @IsString()
    @Transform(toLowerCase)
    name!: string;

    @IsDefined()
    @MinLength(tasksLimits.MIN_DESCRIPTION_LENGTH)
    @MaxLength(tasksLimits.MAX_DESCRIPTION_LENGTH)
    @IsString()
    description!: string;

    @IsDefined()
    @IsIn(tasksStatus)
    @IsString()
    status!: TasksStatus;

    @IsDefined()
    @IsIn(tasksPriority)
    @IsString()
    priority!: TasksPriority;

    static async validateAndTransform(data: object): ValidationResult<CreateTaskValidator> {
        const task = new CreateTaskValidator();
        Object.assign(task, data);

        const errors = await validate(task, validationOptionsConfig);

        if (errors.length > 0)
            return [returnFirstError(errors), undefined];

        return [undefined, plainToInstance(CreateTaskValidator, task)];
    }
}