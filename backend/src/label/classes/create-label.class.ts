import { Label } from '../entities/label.entity';
import { CreateLabelDto } from '../dto/create-label.dto';

export abstract class CreateLabelUseCase {
  abstract execute(dto: CreateLabelDto, userId: number): Promise<Label>;
}
