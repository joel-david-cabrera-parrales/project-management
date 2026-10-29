export type NotificationType = 'success' | 'error' | 'warning' | 'info';

export interface Notification {
  id: string;
  type: NotificationType;
  message: string;
  title?: string;
  duration?: number;
}

export interface NotificationOptions {
  title?: string;
  duration?: number;
}

export type InboxNotificationType =
  | 'task_assigned'
  | 'task_completed'
  | 'comment_mention'
  | 'new_member'
  | 'member_removed'
  | 'workspace_invitation'
  | 'board_created';

export interface NotificationActor {
  id: number;
  name: string;
  photoUrl: string | null;
  initials: string;
}

export interface InboxNotificationData {
  taskId?: number;
  taskCode?: string;
  boardCode?: string;
  boardId?: number;
  commentId?: number;
  commentCode?: string;
  workspaceId?: number;
  workspaceCode?: string;
  invitationCode?: string;
  actorId?: number;
  actor?: NotificationActor;
  [key: string]: unknown;
}

export interface InboxNotification {
  id: number;
  userId: number;
  type: InboxNotificationType;
  title: string;
  message: string;
  data?: InboxNotificationData | null;
  read: boolean;
  readAt?: string | null;
  createdAt: string;
}

export interface InboxNotificationPage {
  items: InboxNotification[];
  total: number;
  page: number;
  limit: number;
  totalPages: number;
}

export interface ActivityToast {
  id: number;
  notification: InboxNotification;
}
