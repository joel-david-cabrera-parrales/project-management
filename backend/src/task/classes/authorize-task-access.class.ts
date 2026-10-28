import { Task } from '../entities/task.entity';

export abstract class AuthorizeTaskAccessUseCase {
  abstract execute(
    taskId: number,
    userId: number,
    allowedRoles?: string[],
    expectedWorkspaceCode?: string,
  ): Promise<Task>;
}
