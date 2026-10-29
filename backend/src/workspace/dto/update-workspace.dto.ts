import { ApiProperty, PartialType } from '@nestjs/swagger';
import { IsIn, IsInt, IsOptional } from 'class-validator';
import { CreateWorkspaceDto } from './create-workspace.dto';

export class UpdateWorkspaceDto extends PartialType(CreateWorkspaceDto) {
  @IsInt()
  @IsIn([1, 2, 3])
  @IsOptional()
  @ApiProperty({
    example: 1,
    description: 'Estado del workspace: 1 = activo, 2 = cerrado, 3 = archivado',
    required: false,
    enum: [1, 2, 3],
  })
  status?: 1 | 2 | 3;
}
