export abstract class InvalidateWorkspaceInvitationUseCase {
  abstract execute(invitationCode: string, userId: number): Promise<void>;
}
