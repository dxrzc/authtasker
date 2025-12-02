import { PickType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { validateDto } from 'src/functions/dtos/validate-dto';

export class TaskStatusDto extends PickType(CreateTaskDto, ['status'] as const) {
    static async validate(data: object): Promise<TaskStatusDto> {
        return await validateDto(TaskStatusDto, data);
    }
}
