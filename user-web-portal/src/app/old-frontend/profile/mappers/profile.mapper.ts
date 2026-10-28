import { Profile, ProfileResponse } from '../models/profile.models';

const AVATAR_COLORS = ['#ef4444', '#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#ec4899', '#8b5cf6', '#14b8a6'];

export class ProfileMapper {
  static toProfile(raw: ProfileResponse): Profile {
    return {
      ...raw,
      initials: ProfileMapper.toInitials(raw.firstName, raw.firstSurname),
      avatarColor: ProfileMapper.toAvatarColor(raw.fullName),
    };
  }

  static toInitials(firstName: string, firstSurname: string): string {
    return (firstName[0] + firstSurname[0]).toUpperCase();
  }

  static toAvatarColor(fullName: string): string {
    const index = fullName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_COLORS.length;
    return AVATAR_COLORS[index];
  }
}
