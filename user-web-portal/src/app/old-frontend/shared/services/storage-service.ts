import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
  private browserStorage(): Storage | null {
    try {
      return typeof localStorage === 'undefined' ? null : localStorage;
    } catch {
      return null;
    }
  }

  setToken(token: string): void {
    this.browserStorage()?.setItem('token', token);
  }
  getToken(): string | null {
    return this.browserStorage()?.getItem('token') ?? null;
  }
  removeToken(): void {
    this.browserStorage()?.removeItem('token');
  }

  setUserCode(code: string): void {
    this.browserStorage()?.setItem('userCode', code);
  }
  getUserCode(): string | null {
    return this.browserStorage()?.getItem('userCode') ?? null;
  }
  removeUserCode(): void {
    this.browserStorage()?.removeItem('userCode');
  }

  setRefreshToken(token: string): void {
    this.browserStorage()?.setItem('refreshToken', token);
  }
  getRefreshToken(): string | null {
    return this.browserStorage()?.getItem('refreshToken') ?? null;
  }
  removeRefreshToken(): void {
    this.browserStorage()?.removeItem('refreshToken');
  }

  removeAll(): void {
    const storage = this.browserStorage();
    storage?.removeItem('token');
    storage?.removeItem('userCode');
    storage?.removeItem('refreshToken');
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
