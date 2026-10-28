import { Component, inject, signal, effect } from '@angular/core';
import { RouterLink } from '@angular/router';
import { ProfileService } from '../../services/profile.service';
import { AuthService } from '../../../auth/services/auth.service';
import { UserSettings, DEFAULT_SETTINGS } from '../../models/profile.models';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';

@Component({
  selector: 'settings-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './settings-page.html',
})
export class SettingsPageComponent {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  protected settings = signal<UserSettings>({ ...DEFAULT_SETTINGS });
  protected loading = signal(true);
  protected saving = signal(false);
  protected activeTab: 'appearance' | 'notifications' = 'appearance';

  protected notificationsList = [
    { key: 'newMember', label: 'New member joins', description: 'When someone joins a workspace' },
    { key: 'taskAssigned', label: 'Task assigned', description: 'When a task is assigned to you' },
    { key: 'taskCompleted', label: 'Task completed', description: 'When a task you follow is completed' },
    { key: 'commentMentioned', label: 'Comment mention', description: 'When someone mentions you in a comment' },
    { key: 'dailyDigest', label: 'Daily digest', description: 'A daily summary of activity across workspaces' },
  ];

  ngOnInit() {
    this.loadSettings();
  }

  private loadSettings(): void {
    this.loading.set(true);
    this.profileService.getSettings().subscribe({
      next: (s) => {
        this.settings.set(s);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  updateSetting(path: string, value: unknown): void {
    this.saving.set(true);
    const patch = buildNestedPatch(path, value);
    this.profileService.updateSettings(patch).subscribe({
      next: (updated) => {
        this.settings.set(updated);
        this.authService.settings.set(updated);
        this.applyTheme(updated.theme);
        this.saving.set(false);
      },
      error: () => this.saving.set(false),
    });
  }

  toggleTheme(): void {
    const next = this.settings().theme === 'light' ? 'dark' : 'light';
    this.updateSetting('theme', next);
  }

  setLanguage(lang: 'es' | 'en'): void {
    this.updateSetting('language', lang);
  }

  getNotificationValue(key: string): boolean {
    const email = this.settings().notifications.email;
    return email[key as keyof typeof email];
  }

  toggleNotification(key: string): void {
    const current = this.getNotificationValue(key);
    this.updateSetting(`notifications.email.${key}`, !current);
  }

  private applyTheme(theme: string): void {
    document.documentElement.classList.toggle('dark', theme === 'dark');
  }
}

function buildNestedPatch(path: string, value: unknown): Record<string, unknown> {
  const keys = path.split('.');
  if (keys.length === 1) return { [keys[0]]: value };
  const result: Record<string, unknown> = {};
  let current = result;
  for (let i = 0; i < keys.length - 1; i++) {
    current[keys[i]] = {};
    current = current[keys[i]] as Record<string, unknown>;
  }
  current[keys[keys.length - 1]] = value;
  return result;
}
