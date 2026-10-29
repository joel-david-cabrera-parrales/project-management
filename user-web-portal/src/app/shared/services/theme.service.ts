import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(typeof localStorage !== 'undefined' && localStorage.getItem('app-theme') === 'dark');

  constructor() {
    this.apply(this.isDark());
  }

  toggle(): void {
    this.setTheme(this.isDark() ? 'light' : 'dark');
  }

  setTheme(theme: 'light' | 'dark'): void {
    const dark = theme === 'dark';
    this.isDark.set(dark);
    this.apply(dark);
    if (typeof localStorage !== 'undefined') localStorage.setItem('app-theme', theme);
  }

  private apply(dark: boolean): void {
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', dark);
  }
}
