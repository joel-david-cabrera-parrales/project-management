import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { catchError, Observable, of, tap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { StorageService } from '../../shared/services/storage.service';
import { AuthenticationResponse, StoredUserProfile } from '../models/authentication.models';

@Injectable({ providedIn: 'root' })
export class AuthenticationSessionService {
  private readonly http = inject(HttpClient);
  private readonly storage = inject(StorageService);
  private readonly profileUrl = `${environment.apiUrl}/profile/me`;

  establishSession(
    response: AuthenticationResponse,
    fallbackProfile: StoredUserProfile,
  ): Observable<StoredUserProfile> {
    this.storage.setToken(response.token);
    this.storage.setRefreshToken(response.refreshToken);
    this.storage.setUserCode(response.user.userCode);

    const profile: StoredUserProfile = {
      ...fallbackProfile,
      userCode: response.user.userCode,
      profileCode: response.user.profileCode,
      email: response.user.email ?? fallbackProfile.email,
      fullName: response.user.name ?? fallbackProfile.fullName,
      createdAt: response.user.createdAt ?? fallbackProfile.createdAt ?? null,
    };

    // Store a usable profile immediately. The API response below fills in
    // authoritative profile fields when the profile endpoint is available.
    this.storage.setProfile(profile);

    return this.http.get<StoredUserProfile>(this.profileUrl).pipe(
      tap((fullProfile) => this.storage.setProfile(fullProfile)),
      catchError(() => of(profile)),
    );
  }

  completeGoogleSignIn(token: string): Observable<StoredUserProfile> {
    try {
      const encodedPayload = token.split('.')[1];
      if (!encodedPayload) throw new Error('Invalid authentication token');

      const normalizedPayload = encodedPayload.replace(/-/g, '+').replace(/_/g, '/');
      const paddedPayload = normalizedPayload.padEnd(Math.ceil(normalizedPayload.length / 4) * 4, '=');
      const payload = JSON.parse(atob(paddedPayload)) as { userCode?: string };
      if (!payload.userCode) throw new Error('User information is missing from the token');

      this.storage.setToken(token);
      this.storage.removeRefreshToken();
      this.storage.setUserCode(payload.userCode);

      return this.http.get<StoredUserProfile>(this.profileUrl).pipe(
        tap((profile) => this.storage.setProfile(profile)),
      );
    } catch (error) {
      return throwError(() => error);
    }
  }
}
