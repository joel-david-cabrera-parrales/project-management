import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class ThemeService {
  readonly isDark = signal(typeof localStorage !== 'undefined' && localStorage.getItem('app-theme') === 'dark');

  constructor() {
    this.apply(this.isDark());
  }

  toggle(): void {
    const next = !this.isDark();
    this.isDark.set(next);
    this.apply(next);
    if (typeof localStorage !== 'undefined') localStorage.setItem('app-theme', next ? 'dark' : 'light');
  }

  private apply(dark: boolean): void {
    if (typeof document !== 'undefined') document.documentElement.classList.toggle('dark', dark);
  }
}
