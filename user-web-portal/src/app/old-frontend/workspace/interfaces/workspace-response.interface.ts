export interface UserRelationResponse {
  workspaceMemberId: number;
  fullname: string;
  roleMember: string;
}

export interface WorkspaceResponse {
  id: number;
  code: string;
  slugCode: string;
  title: string;
  description: string;
  color: string;
  status: number;
  isAvailable: boolean;
  createdAt: string;
  updatedAt: string;
  workspaceMembers: WorkspaceMemberResponse[];
  userRelation?: UserRelationResponse;
  boards: BoardResponse[];
}

export interface BoardResponse {
  boardId: number;
  code: string;
  starred: boolean;
  taskList: TaskListResponse[];
}

export interface TaskListResponse {
  id: number;
  code: string;
  title: string;
  position: number;
  isAvailable: boolean;
  tasks: TaskResponse[];
}

export interface TaskResponse {
  taskId: number;
  code: string;
  title: string;
  description: string;
  dateInit: string;
  dateEnd: string;
  completed: boolean;
  position: number;
  isAvailable: boolean;
  labels: LabelResponse[];
  assignees: AssigneeResponse[];
  attachmentsCount?: number;
  commentsCount?: number;
}

export interface AssigneeResponse {
  id: number;
  workspaceMemberId: number;
  fullname: string;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface LabelResponse {
  id: number;
  name: string;
  color: string;
}

export interface WorkspaceMemberResponse {
  workspaceMemberId: number;
  fullname: string;
  roleMember: string;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}
