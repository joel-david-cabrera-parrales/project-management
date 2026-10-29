import { ApiProperty } from '@nestjs/swagger';
import { TaskListResponse } from './task-list.response';

export class BoardResponse {
  @ApiProperty({ example: 1 })
  boardId: number;

  @ApiProperty({ example: 'a750d349-4f01-4e56-a547-44b25e271d67' })
  code: string;

  @ApiProperty({ example: 'Tablero principal', required: false })
  title?: string | null;

  @ApiProperty({ example: false })
  starred: boolean;

  @ApiProperty({ type: [TaskListResponse] })
  taskList: TaskListResponse[];
}
