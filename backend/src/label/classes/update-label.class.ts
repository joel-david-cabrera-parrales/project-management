import { Label } from '../entities/label.entity';
import { UpdateLabelDto } from '../dto/update-label.dto';

export abstract class UpdateLabelUseCase {
  abstract execute(id: number, dto: UpdateLabelDto, userId: number): Promise<Label>;
}
