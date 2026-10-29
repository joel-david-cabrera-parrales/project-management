import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsDateString,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
  MinLength,
} from 'class-validator';

export class CreateTaskDto {
  @IsString()
  @IsNotEmpty()
  @MinLength(5)
  @MaxLength(250)
  @ApiProperty({
    example: 'Tarea 1',
    description: 'Título de la tarea',
  })
  title: string;

  @IsString()
  @IsOptional()
  @MinLength(5)
  @MaxLength(25000)
  @ApiProperty({
    example: 'Descripción de la tarea',
    description: 'Descripción de la tarea',
  })
  description: string;

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
  position: number;

  @IsNumber()
  @ApiProperty({
    example: 1,
    description: 'ID de la lista de tareas',
  })
  taskListId: number;

  @IsString()
  @IsUUID()
  @ApiProperty({
    example: 'a750d349-4f01-4e56-a547-44b25e271d67',
    description: 'Código del workspace',
  })
  workspaceCode: string;

  @IsString()
  @IsUUID()
  @ApiProperty({
    example: 'a750d349-4f01-4e56-a547-44b25e271d67',
    description: 'Código del tablero',
  })
  boardCode: string;
}
