export enum NotificationType {
  TASK_ASSIGNED = 'task_assigned',
  TASK_COMPLETED = 'task_completed',
  COMMENT_MENTION = 'comment_mention',
  NEW_MEMBER = 'new_member',
  MEMBER_REMOVED = 'member_removed',
  WORKSPACE_INVITATION = 'workspace_invitation',
}

export interface NotificationData {
  taskId?: number;
  taskCode?: string;
  boardCode?: string;
  commentId?: number;
  commentCode?: string;
  workspaceId?: number;
  workspaceCode?: string;
  invitationCode?: string;
  actorId?: number;
  actor?: {
    id: number;
    name: string;
    photoUrl: string | null;
    initials: string;
  };
  [key: string]: string | number | boolean | null | undefined | NotificationData['actor'];
}
