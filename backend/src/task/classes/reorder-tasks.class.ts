import { ReorderTasksDto } from '../dto/reorder-tasks.dto';

export abstract class ReorderTasksUseCase {
  abstract execute(dto: ReorderTasksDto, userId: number, workspaceCode: string): Promise<void>;
}
