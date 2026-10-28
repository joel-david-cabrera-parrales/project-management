import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class StorageService {
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
