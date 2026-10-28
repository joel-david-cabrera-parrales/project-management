export type WorkspaceMemberRole = 'owner' | 'member' | 'viewer';

export interface WorkspaceDetailMember {
  workspaceMemberId: number;
  fullname: string;
  roleMember: WorkspaceMemberRole;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface WorkspaceDetailBoard {
  boardId: number;
  code: string;
  starred: boolean;
  taskList: Array<{ id: number; code: string; title: string; position: number; isAvailable: boolean }>;
}

export interface WorkspaceDetailApiResponse {
  id: number;
  code: string;
  title: string;
  description: string | null;
  color: string | null;
  status: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt?: string;
  workspaceMembers: WorkspaceDetailMember[];
  userRelation?: { workspaceMemberId: number; fullname: string; roleMember: WorkspaceMemberRole };
  boards: WorkspaceDetailBoard[];
}

export interface WorkspaceDetail {
  id: number;
  code: string;
  name: string;
  description: string;
  color: string;
  status: number;
  createdAt: Date;
  members: WorkspaceDetailMember[];
  roleMember: WorkspaceMemberRole | null;
  boards: WorkspaceDetailBoard[];
}

export interface WorkspaceLabel {
  id: number;
  code: string;
  name: string;
  color: string;
}

export interface WorkspaceInvitation {
  code: string;
  invitedEmail: string;
  invitedName: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
  role: WorkspaceMemberRole;
  accepted: boolean;
  isAvailable: boolean;
  createdAt: string;
  updatedAt?: string;
  dateAcepted?: string;
}

export interface SendWorkspaceInvitation {
  workspaceCode: string;
  invitedEmail: string;
  inviterEmail: string;
  rolMember: Exclude<WorkspaceMemberRole, 'owner'>;
}

export interface SendWorkspaceInvitationResponse {
  inviteLink: string;
}
