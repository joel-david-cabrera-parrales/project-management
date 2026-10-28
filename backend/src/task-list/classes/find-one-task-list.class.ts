import { TaskListResponse } from 'src/common/responses/task-list.response';

export abstract class FindOneTaskListUseCase {
  abstract execute(id: number, userId: number): Promise<TaskListResponse>;
}
