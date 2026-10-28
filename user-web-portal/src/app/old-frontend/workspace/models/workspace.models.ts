export interface UserRelation {
  workspaceMemberId: number;
  fullname: string;
  roleMember: string;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  color: string;
  initials?: string;
  boards: Board[];
  members: Member[];
  userRelation?: UserRelation;
  createdAt: Date;
}

export interface Board {
  id: number;
  code: string;
  backgroundType?: 'gradient' | 'image' | 'color';
  background: string;
  lists: BoardList[];
  starred?: boolean;
  visibility?: 'private' | 'workspace' | 'public';
}

export interface BoardList {
  id: number;
  code: string;
  title: string;
  position: number;
  tasks: Task[];
}

export interface Task {
  id: number;
  code: string;
  title: string;
  description?: string;
  dateInit?: string;
  dateEnd?: string;
  position: number;
  priority: 'urgent' | 'high' | 'medium';
  completed: boolean;
  isAvailable: boolean;

  checklistTotal: number;
  checklistDone: number;

  comments: number;
  attachments: number;
  attachmentsList?: TaskAttachment[];

  labels?: Label[];
  assignees?: Assignment[];
}

export interface Label {
  id: number;
  code?: string;
  name: string;
  color: string;
}

export interface Assignment {
  id: number;
  workspaceMemberId: number;
  fullname: string;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface Member {
  id: number;
  name: string;
  email: string;
  roleMember: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface CreateWorkspaceDto {
  title: string;
  description: string;
  color: string;
}

export interface CreateBoardDto {
  title: string;
  workspaceId: string;
  backgroundType: 'gradient' | 'color';
  background: string;
}

export interface CreateTaskDto {
  title: string;
  workspaceCode: string;
  boardCode: string;
  taskListId: number;
  position: number;
  description?: string;
  dateInit?: string;
  dateEnd?: string;
  completed?: boolean;
}

export interface CreateListDto {
  title: string;
  boardId: number;
  position: number;
}

export interface UpdateTaskDto {
  title?: string;
  description?: string;
  dateInit?: string;
  dateEnd?: string;
  completed?: boolean;
  position?: number;
  taskListId?: number;
}

export interface TaskAttachment {
  id: number;
  code: string;
  fileName: string;
  fileSize: number;
  mimeType: string;
  url: string;
  thumbnailUrl?: string;
  createdAt: string;
}

export interface TaskComment {
  id: number;
  code: string;
  content: string;
  author: Assignment;
  parentId: number | null;
  mentions: number[];
  createdAt: string;
  updatedAt?: string;
  replies?: TaskComment[];
}

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
  createdAt: string;
  updatedAt?: string;
  dateAcepted?: string;
}
