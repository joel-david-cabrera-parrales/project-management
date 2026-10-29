import { ApiProperty } from '@nestjs/swagger';
import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class UpdateBoardDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  @ApiProperty({
    example: 'Tablero principal',
    description: 'Título del tablero',
    maxLength: 150,
  })
  title: string;
}
