import { UpdateTaskListDto } from '../dto/update-task-list.dto';
import { TaskListResponse } from 'src/common/responses/task-list.response';

export abstract class UpdateTaskListUseCase {
  abstract execute(id: number, dto: UpdateTaskListDto, userId: number): Promise<TaskListResponse>;
}
