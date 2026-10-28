import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';

export abstract class AuthorizeWorkspaceMembershipUseCase {
  abstract execute(workspaceCode: string, userId: number, allowedRoles?: string[]): Promise<WorkspaceMember>;
}
