export interface EmailNotifications {
  newMember: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  commentMentioned: boolean;
  dailyDigest: boolean;
}

export interface Notifications {
  email: EmailNotifications;
  inApp: InAppNotifications;
}

export interface InAppNotifications {
  newMember: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  commentMentioned: boolean;
  memberRemoved: boolean;
  workspaceInvitation: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  notifications: Notifications;
}

export const DEFAULT_SETTINGS: UserSettings = {
  theme: 'light',
  language: 'es',
  notifications: {
    email: {
      newMember: true,
      taskAssigned: true,
      taskCompleted: false,
      commentMentioned: true,
      dailyDigest: false,
    },
    inApp: {
      newMember: true,
      taskAssigned: true,
      taskCompleted: true,
      commentMentioned: true,
      memberRemoved: true,
      workspaceInvitation: true,
    },
  },
};
