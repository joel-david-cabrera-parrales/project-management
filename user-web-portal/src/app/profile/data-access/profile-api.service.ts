import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../shared/services/storage.service';
import {
  ChangePasswordRequest,
  mapToUserProfile,
  UpdateProfileRequest,
  UserProfile,
  UserProfileResponse,
} from '../models/profile.models';

@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly baseUrl = environment.apiUrl;

  getMyProfile(): Observable<UserProfile> {
    return this.http.get<UserProfileResponse>(`${this.baseUrl}/profile/me`).pipe(
      tap((raw) => this.syncStoredProfile(raw)),
      map((raw) => mapToUserProfile(raw)),
    );
  }

  updateMyProfile(dto: UpdateProfileRequest): Observable<UserProfile> {
    return this.http.patch<UserProfileResponse>(`${this.baseUrl}/profile/me`, dto).pipe(
      tap((raw) => this.syncStoredProfile(raw)),
      map((raw) => mapToUserProfile(raw)),
    );
  }

  uploadProfilePhoto(file: File): Observable<UserProfile> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<UserProfileResponse>(`${this.baseUrl}/profile/photo`, formData).pipe(
      map((raw) => {
        const photoWithBust = raw.photo
          ? `${raw.photo}${raw.photo.includes('?') ? '&' : '?'}v=${Date.now()}`
          : null;
        return { ...raw, photo: photoWithBust };
      }),
      tap((raw) => this.syncStoredProfile(raw)),
      map((raw) => mapToUserProfile(raw)),
    );
  }

  changePassword(dto: ChangePasswordRequest): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/change-password`, dto);
  }

  private syncStoredProfile(raw: UserProfileResponse): void {
    const current = this.storage.getProfile();
    this.storage.setProfile({
      ...current,
      userCode: raw.userCode,
      profileCode: raw.profileCode,
      firstName: raw.firstName,
      secondName: raw.secondName,
      firstSurname: raw.firstSurname,
      secondSurname: raw.secondSurname,
      email: raw.email,
      phone: raw.phone,
      photo: raw.photo ?? current?.photo ?? null,
      dateBirth: raw.dateBirth,
      createdAt: raw.createdAt,
      fullName: raw.fullName,
    });
  }
}
