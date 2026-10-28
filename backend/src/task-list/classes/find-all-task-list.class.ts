import { TaskListResponse } from 'src/common/responses/task-list.response';

export abstract class FindAllTaskListUseCase {
  abstract execute(userId: number): Promise<TaskListResponse[]>;
}
