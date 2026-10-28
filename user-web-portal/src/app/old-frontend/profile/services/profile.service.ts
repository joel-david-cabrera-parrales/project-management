import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { map } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { Profile, ProfileResponse, UpdateProfileDto, ChangePasswordDto, UserSettings } from '../models/profile.models';
import { ProfileMapper } from '../mappers/profile.mapper';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getMyProfile() {
    return this.http.get<ProfileResponse>(`${this.baseUrl}/profile/me`)
      .pipe(map(ProfileMapper.toProfile));
  }

  updateMyProfile(dto: UpdateProfileDto) {
    return this.http.patch<ProfileResponse>(`${this.baseUrl}/profile/me`, dto)
      .pipe(map(ProfileMapper.toProfile));
  }

  changePassword(dto: ChangePasswordDto) {
    return this.http.post<void>(`${this.baseUrl}/auth/change-password`, dto);
  }

  getSettings() {
    return this.http.get<UserSettings>(`${this.baseUrl}/profile/settings`);
  }

  updateSettings(dto: Partial<UserSettings>) {
    return this.http.patch<UserSettings>(`${this.baseUrl}/profile/settings`, dto);
  }

  uploadProfilePhoto(file: File) {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<Profile>(`${this.baseUrl}/profile/photo`, formData)
      .pipe(map(ProfileMapper.toProfile));
  }
}
