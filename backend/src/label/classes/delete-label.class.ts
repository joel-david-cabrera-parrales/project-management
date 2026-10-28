import { Label } from '../entities/label.entity';

export abstract class DeleteLabelUseCase {
  abstract execute(id: number, userId: number, workspaceCode: string): Promise<Label>;
}
