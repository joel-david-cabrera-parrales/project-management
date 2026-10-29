import { Injectable, signal } from '@angular/core';
import { StoredUserProfile } from '../../authentication/models/authentication.models';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private readonly _profile = signal<StoredUserProfile | null>(this.readStoredProfile());
  readonly profile = this._profile.asReadonly();

  setToken(token: string): void {
    localStorage.setItem('token', token);
  }
  getToken(): string | null {
    return localStorage.getItem('token');
  }
  removeToken(): void {
    localStorage.removeItem('token');
  }

  setUserCode(code: string): void {
    localStorage.setItem('userCode', code);
  }
  getUserCode(): string | null {
    return localStorage.getItem('userCode');
  }
  removeUserCode(): void {
    localStorage.removeItem('userCode');
  }

  setProfile(profile: StoredUserProfile): void {
    localStorage.setItem('profile', JSON.stringify(profile));
    this._profile.set(profile);
  }

  getProfile(): StoredUserProfile | null {
    const stored = this.readStoredProfile();
    if (this._profile() !== stored) {
      this._profile.set(stored);
    }
    return stored;
  }

  removeProfile(): void {
    localStorage.removeItem('profile');
    this._profile.set(null);
  }

  setRefreshToken(token: string): void {
    localStorage.setItem('refreshToken', token);
  }
  getRefreshToken(): string | null {
    return localStorage.getItem('refreshToken');
  }
  removeRefreshToken(): void {
    localStorage.removeItem('refreshToken');
  }

  removeAll(): void {
    localStorage.removeItem('token');
    localStorage.removeItem('userCode');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('profile');
    this._profile.set(null);
  }

  private readStoredProfile(): StoredUserProfile | null {
    if (typeof localStorage === 'undefined') return null;
    const profile = localStorage.getItem('profile');
    if (!profile) return null;

    try {
      return JSON.parse(profile) as StoredUserProfile;
    } catch {
      localStorage.removeItem('profile');
      return null;
    }
  }

  isTokenExpired(): boolean {
    const token = this.getToken();
    if (!token) return true;

    try {
      const payload = JSON.parse(atob(token.split('.')[1]));
      // `exp` is in seconds; Date.now() is in milliseconds
      return payload.exp * 1000 < Date.now();
    } catch {
      return true;
    }
  }

  isAuthenticated(): boolean {
    return !!this.getToken() && !this.isTokenExpired();
  }
}
