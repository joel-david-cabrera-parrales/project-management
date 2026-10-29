export interface EmailNotificationSettings {
  newMember: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  commentMentioned: boolean;
  dailyDigest: boolean;
}

export type EmailNotificationKey = keyof EmailNotificationSettings;

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  notifications: {
    email: EmailNotificationSettings;
  };
}

export interface UpdateSettingsPatch {
  theme?: 'light' | 'dark';
  language?: 'es' | 'en';
  notifications?: {
    email?: Partial<EmailNotificationSettings>;
  };
}

export const DEFAULT_USER_SETTINGS: UserSettings = {
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
  },
};
