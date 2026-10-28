import { inject, Injectable, signal, effect } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { StorageService } from '../../shared/services/storage-service';
import { catchError, Observable, of, tap } from 'rxjs';
import { LoginResponse } from '../interfaces/login-response.interface';
import { CreateNewProfile } from '../interfaces/create-new-profile.interface';
import { NotificationService } from '../../shared/services/notification.service';
import { ProfileService } from '../../profile/services/profile.service';
import { Profile, UserSettings, DEFAULT_SETTINGS } from '../../profile/models/profile.models';
import { TranslationService } from '../../shared/services/translation.service';

@Injectable({
  providedIn: 'root',
})
export class AuthService {
  private readonly baseUrl = environment.apiUrl + '/auth';
  private readonly http = inject(HttpClient);
  private readonly storageService = inject(StorageService);
  private readonly notification = inject(NotificationService);
  private readonly profileService = inject(ProfileService);
  private readonly translationService = inject(TranslationService);

  currentUserEmail = signal<string | null>(null);
  userCode = signal<string | null>(null);
  currentUserProfile = signal<Profile | null>(null);
  settings = signal<UserSettings>({ ...DEFAULT_SETTINGS });

  constructor() {
    this.userCode.set(this.storageService.getUserCode());
    if (this.storageService.getToken()) {
      this.loadProfile();
    }
    effect(() => {
      const theme = this.settings().theme;
      document.documentElement.classList.toggle('dark', theme === 'dark');
    });
    effect(() => {
      const lang = this.settings().language;
      this.translationService.setLanguage(lang);
    });
  }

  refreshProfile(): void {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.profileService.getMyProfile().subscribe({
      next: (p) => {
        this.currentUserProfile.set(p);
        this.currentUserEmail.set(p.email);
      },
    });
    this.profileService.getSettings().subscribe({
      next: (s) => this.settings.set(s),
    });
  }

  public login(username: string, password: string) {
    const url = `${this.baseUrl}/login`;
    const payload = {
      username,
      password,
    };

    return this.http.post<LoginResponse>(url, payload).pipe(
      tap((response) => {
        this.storageService.setToken(response.token);
        this.storageService.setRefreshToken(response.refreshToken);
        this.storageService.setUserCode(response.user.userCode);
        this.currentUserEmail.set(username);
        this.userCode.set(response.user.userCode);
        this.loadProfile();
      }),
      tap(() => {
        this.notification.success('notifications.loginSuccess');
      }),
      catchError((error) => this.handleErrors(error)),
    );
  }

  public registerProfile(profile: CreateNewProfile) {
    const url = `${this.baseUrl}/register`;
    return this.http.post<LoginResponse>(url, profile).pipe(
      tap((response) => {
        this.storageService.setToken(response.token);
        this.storageService.setRefreshToken(response.refreshToken);
        this.storageService.setUserCode(response.user.userCode);
        this.currentUserEmail.set(profile.email);
        this.userCode.set(response.user.userCode);
        this.loadProfile();
      }),
      tap(() => {
        this.notification.success('notifications.registerSuccess');
      }),
      catchError((error) => this.handleErrors(error)),
    );
  }

  public handleGoogleCallback(token: string): void {
    this.storageService.setToken(token);
    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      if (payload.email) this.currentUserEmail.set(payload.email);
      if (payload.userCode) {
        this.storageService.setUserCode(payload.userCode);
        this.userCode.set(payload.userCode);
      }
    } catch {}
    this.loadProfile();
  }

  public sendPasswordResetCode(email: string) {
    const url = `${this.baseUrl}/forgot-password`;
    const payload = { email };

    return this.http.post(url, payload).pipe(
      tap(() => {
        this.notification.success('notifications.codeSent');
      }),
      catchError((error) => this.handleErrors(error)),
    );
  }

  public verifyPasswordResetCode(email: string, code: string) {
    const url = `${this.baseUrl}/verify-reset-code`;
    const payload = { code: code.replace(/-/g, '') };

    return this.http.post<LoginResponse>(url, payload).pipe(
      tap((response) => {
        this.storageService.setToken(response.token);
        this.storageService.setUserCode(response.user.userCode);
        this.currentUserEmail.set(email);
        this.userCode.set(response.user.userCode);
        this.notification.success('notifications.codeVerified');
        this.loadProfile();
      }),
      catchError((error) => this.handleErrors(error)),
    );
  }

  public resetPassword( newPassword: string) {
    const url = `${this.baseUrl}/reset-password`;
    const payload = { password: newPassword };

    return this.http.post(url, payload).pipe(
      tap(() => {
        this.notification.success('notifications.passwordReset');
      }),
      catchError((error) => this.handleErrors(error)),
    );
  }

  private handleErrors(error: HttpErrorResponse) {
    this.storageService.removeAll();
    switch (error.status) {
      case 401:
      case 400:
        this.notification.warning(error.error.message);
        break;
      case 404:
        this.notification.error(error.error.message);
        break;
      default:
        this.notification.error('notifications.unexpectedError');
        break;
    }

    return of(null);
  }
}
