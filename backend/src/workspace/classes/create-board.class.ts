import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';

export abstract class CreateBoardUseCase {
  abstract execute(workspaceCode: string, title: string, createdBy: AuthenticatedUserDto): Promise<{
    boardId: number;
    code: string;
    title: string;
    starred: boolean;
    taskList: unknown[];
  }>;
}
