import { PickType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';

export class TaskPriorityDto extends PickType(CreateTaskDto, ['priority'] as const) {
    static async validate(data: object): Promise<TaskPriorityDto> {
        return await validateAndTransformDto(TaskPriorityDto, data);
    }
}
