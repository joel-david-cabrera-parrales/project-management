import { IsBoolean, IsDateString, IsNumber, IsOptional, IsString, MaxLength, MinLength } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class UpdateTaskDto {
  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(250)
  @ApiProperty({
    example: 'Tarea 1',
    description: 'Título de la tarea',
  })
  title?: string;

  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(25000)
  @ApiProperty({
    example: 'Descripción de la tarea',
    description: 'Descripción de la tarea',
  })
  description?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({
    example: '2022-01-01',
    description: 'Fecha de inicio de la tarea',
  })
  dateInit?: string;

  @IsDateString()
  @IsOptional()
  @ApiProperty({
    example: '2022-01-01',
    description: 'Fecha de finalización de la tarea',
  })
  dateEnd?: string;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 1,
    description: 'Posición de la tarea',
  })
  position?: number;

  @IsBoolean()
  @IsOptional()
  @ApiProperty({
    example: true,
    description: 'Estado de la tarea',
  })
  completed?: boolean;

  @IsNumber()
  @IsOptional()
  @ApiProperty({
    example: 1,
    description: 'ID de la lista de tareas',
  })
  taskListId?: number;
}
