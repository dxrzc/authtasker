import { PickType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class TaskPriorityDto extends PickType(CreateTaskDto, ['priority'] as const) {
    static async validate(data: Record<string, unknown>): Promise<TaskPriorityDto> {
        return await parseAndValidateOrThrow(TaskPriorityDto, data);
    }
}
