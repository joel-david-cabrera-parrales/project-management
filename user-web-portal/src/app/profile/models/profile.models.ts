export interface UserProfileResponse {
  userCode: string;
  profileCode: string;
  authenticationType?: {
    code: 'USER' | 'GOOGLE' | 'MICROSOFT';
    name: string;
  };
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

export interface UserProfile extends UserProfileResponse {
  initials: string;
  avatarColor: string;
}

export interface UpdateProfileRequest {
  firstName?: string;
  secondName?: string;
  firstSurname?: string;
  secondSurname?: string;
  phone?: string[];
}

export interface ChangePasswordRequest {
  currentPassword: string;
  newPassword: string;
}

const AVATAR_COLORS = [
  '#2563eb',
  '#4f46e5',
  '#0891b2',
  '#059669',
  '#d97706',
  '#dc2626',
  '#7c3aed',
  '#db2777',
];

export function mapToUserProfile(raw: UserProfileResponse): UserProfile {
  const firstChar = raw.firstName?.trim()?.charAt(0) || '';
  const lastChar = raw.firstSurname?.trim()?.charAt(0) || '';
  const fallbackInitials = (raw.fullName || raw.email || 'U')
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part.charAt(0).toUpperCase())
    .join('');

  const initials = (firstChar + lastChar).toUpperCase() || fallbackInitials || 'U';
  const seed = raw.fullName || raw.email || raw.userCode || 'U';
  const colorIndex =
    seed.split('').reduce((acc, char) => acc + char.charCodeAt(0), 0) % AVATAR_COLORS.length;

  return {
    ...raw,
    phone: Array.isArray(raw.phone) ? raw.phone : [],
    initials,
    avatarColor: AVATAR_COLORS[colorIndex],
  };
}
