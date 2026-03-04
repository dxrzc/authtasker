import { PickType } from '@nestjs/mapped-types';
import { CreateTaskDto } from './create-task.dto';
import { parseAndValidateOrThrow } from 'src/dtos/helpers/parse-and-validate-or-throw.helper';

export class TaskStatusDto extends PickType(CreateTaskDto, ['status'] as const) {
    static async validate(data: Record<string, unknown>): Promise<TaskStatusDto> {
        return await parseAndValidateOrThrow(TaskStatusDto, data);
    }
}
