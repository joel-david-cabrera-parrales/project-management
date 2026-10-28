import { WorkspaceInvitation } from '../entities/workspace-invitation.entity';

export abstract class GetWorkspaceInvitationUseCase {
  abstract execute(invitationCode: string, userId: number): Promise<WorkspaceInvitation>;
}
