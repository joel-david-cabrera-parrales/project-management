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

export interface WorkspaceListItem {
  code: string;
  name: string;
  initials: string;
  description: string;
  color: string;
  status: number;
  boardCount: number;
  memberCount: number;
  createdAt: Date;
}
