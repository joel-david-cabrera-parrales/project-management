export interface InvitationItem {
  code: string;
  invitedEmail: string;
  invitedName: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
  role: string;
  accepted: boolean;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt?: Date;
  dateAcepted?: Date;
}

export abstract class GetWorkspaceInvitationsUseCase {
  abstract execute(workspaceCode: string, userId: number): Promise<InvitationItem[]>;
}
