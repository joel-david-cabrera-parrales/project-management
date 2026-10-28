export interface WorkspaceListApiResponse {
  id: number;
  code: string;
  title: string;
  description: string | null;
  color: string | null;
  status: number;
  isAvailable: boolean;
  createdAt: string;
  workspaceMembers?: Array<{ workspaceMemberId: number }>;
  boards?: Array<{ boardId: number }>;
}

export type WorkspaceStatus = 1 | 2 | 3;

export interface CreateWorkspacePayload {
  title: string;
  description?: string;
  color: string;
}

export interface WorkspaceListItem {
  code: string;
  name: string;
  initials: string;
  description: string;
  color: string;
  status: WorkspaceStatus;
  boardCount: number;
  memberCount: number;
  createdAt: Date;
}
