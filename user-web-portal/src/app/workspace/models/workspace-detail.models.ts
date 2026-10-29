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

export interface WorkspaceTaskLabel {
  id: number;
  code: string;
  name: string;
  color: string;
}

export interface WorkspaceTaskAssignee {
  id: number;
  workspaceMemberId: number;
  fullname: string;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface WorkspaceTask {
  taskId: number;
  code: string;
  title: string;
  description: string | null;
  dateInit?: string | null;
  dateEnd?: string | null;
  completed: boolean;
  position: number;
  isAvailable: boolean;
  labels: WorkspaceTaskLabel[];
  assignees: WorkspaceTaskAssignee[];
  attachmentsCount?: number;
  commentsCount?: number;
}

export interface WorkspaceDetailTaskList {
  id: number;
  code: string;
  title: string;
  position: number;
  isAvailable: boolean;
  tasks: WorkspaceTask[];
}

export interface WorkspaceDetailBoard {
  boardId: number;
  code: string;
  title?: string | null;
  starred: boolean;
  taskList: WorkspaceDetailTaskList[];
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
  workspaceMemberId: number | null;
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

export interface CreateWorkspaceTaskPayload {
  title: string;
  description?: string;
  dateInit?: string;
  dateEnd?: string;
  position: number;
  taskListId: number;
  workspaceCode: string;
  boardCode: string;
}

export interface UpdateWorkspaceTaskPayload {
  title?: string;
  description?: string;
  dateInit?: string;
  dateEnd?: string;
  completed?: boolean;
  position?: number;
  taskListId?: number;
}

export interface ReorderWorkspaceTasksPayload {
  listId: number;
  taskIds: number[];
}

export interface WorkspaceTaskDropEvent {
  boardCode: string;
  sourceListId: number;
  targetListId: number;
  previousIndex: number;
  currentIndex: number;
}

export interface WorkspaceTaskAttachment {
  id: number;
  code: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  createdAt: string;
}

export interface WorkspaceTaskCommentAuthor {
  id: number;
  fullname: string;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface WorkspaceTaskComment {
  id: number;
  code: string;
  content: string;
  author: WorkspaceTaskCommentAuthor;
  parentId: number | null;
  mentions: number[];
  createdAt: string;
  replies?: WorkspaceTaskComment[];
}
