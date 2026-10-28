import { CreateTaskListDto } from '../dto/create-task-list.dto';
import { TaskListResponse } from 'src/common/responses/task-list.response';

export abstract class CreateTaskListUseCase {
  abstract execute(dto: CreateTaskListDto, userId: number): Promise<TaskListResponse>;
}
