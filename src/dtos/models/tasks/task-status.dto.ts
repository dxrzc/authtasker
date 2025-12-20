import { PickType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { validateAndTransformDto } from 'src/functions/dtos/validate-dto';

export class TaskStatusDto extends PickType(CreateTaskDto, ['status'] as const) {
    static async validate(data: Record<string, unknown>): Promise<TaskStatusDto> {
        return await validateAndTransformDto(TaskStatusDto, data);
    }
}
