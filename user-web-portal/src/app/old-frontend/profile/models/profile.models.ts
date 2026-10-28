export interface ProfileResponse {
  userCode: string;
  profileCode: string;
  firstName: string;
  secondName: string | null;
  firstSurname: string;
  secondSurname: string | null;
  email: string;
  phone: string[];
  photo: string | null;
  dateBirth: string;
  createdAt: string;
  fullName: string;
}

export interface Profile extends ProfileResponse {
  initials: string;
  avatarColor: string;
}

export interface UpdateProfileDto {
  firstName?: string;
  secondName?: string;
  firstSurname?: string;
  secondSurname?: string;
  phone?: string[];
}

export interface ChangePasswordDto {
  currentPassword: string;
  newPassword: string;
}

export interface EmailNotifications {
  newMember: boolean;
  taskAssigned: boolean;
  taskCompleted: boolean;
  commentMentioned: boolean;
  dailyDigest: boolean;
}

export interface UserSettings {
  theme: 'light' | 'dark';
  language: 'es' | 'en';
  notifications: {
    email: EmailNotifications;
  };
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
  },
};
