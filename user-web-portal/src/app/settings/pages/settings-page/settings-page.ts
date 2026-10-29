import { Component, computed, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { ThemeService } from '../../../shared/services/theme.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { SettingsApiService } from '../../data-access/settings-api.service';
import {
  DEFAULT_USER_SETTINGS,
  EmailNotificationKey,
  UpdateSettingsPatch,
  UserSettings,
} from '../../models/settings.models';

type SettingsTab = 'appearance' | 'notifications';

@Component({
  selector: 'app-settings-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './settings-page.html',
  styleUrl: './settings-page.css',
})
export class SettingsPage implements OnInit {
  private readonly settingsApi = inject(SettingsApiService);
  private readonly notifications = inject(NotificationService);
  readonly theme = inject(ThemeService);
  readonly translation = inject(TranslationService);

  readonly activeTab = signal<SettingsTab>('appearance');
  readonly loading = signal(true);
  readonly loadError = signal(false);
  readonly saving = signal(false);

  readonly settings = signal<UserSettings>({
    ...DEFAULT_USER_SETTINGS,
    theme: this.theme.isDark() ? 'dark' : 'light',
    language: this.translation.currentLang(),
    notifications: {
      email: { ...DEFAULT_USER_SETTINGS.notifications.email },
    },
  });

  readonly notificationKeys: readonly EmailNotificationKey[] = [
    'newMember',
    'taskAssigned',
    'taskCompleted',
    'commentMentioned',
    'dailyDigest',
  ];

  readonly activeNotificationsCount = computed(() => {
    const email = this.settings().notifications.email;
    return this.notificationKeys.filter((key) => Boolean(email[key])).length;
  });

  readonly currentTheme = computed<'light' | 'dark'>(() => {
    return this.theme.isDark() ? 'dark' : 'light';
  });

  readonly currentLanguage = computed<'es' | 'en'>(() => {
    return this.translation.currentLang();
  });

  ngOnInit(): void {
    this.loadSettings();
  }

  loadSettings(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.settingsApi.getSettings().subscribe({
      next: (loaded) => {
        const merged: UserSettings = {
          theme: loaded?.theme ?? (this.theme.isDark() ? 'dark' : 'light'),
          language: loaded?.language ?? this.translation.currentLang(),
          notifications: {
            email: {
              ...DEFAULT_USER_SETTINGS.notifications.email,
              ...(loaded?.notifications?.email ?? {}),
            },
          },
        };
        this.settings.set(merged);
        this.theme.setTheme(merged.theme);
        if (merged.language !== this.translation.currentLang()) {
          void this.translation.setLanguage(merged.language);
        }
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.loadError.set(true);
      },
    });
  }

  selectTab(tab: SettingsTab): void {
    this.activeTab.set(tab);
  }

  onTabKeydown(event: KeyboardEvent, current: SettingsTab): void {
    const order: SettingsTab[] = ['appearance', 'notifications'];
    const idx = order.indexOf(current);
    let nextTab: SettingsTab | null = null;

    if (event.key === 'ArrowRight') {
      event.preventDefault();
      nextTab = order[(idx + 1) % order.length];
    } else if (event.key === 'ArrowLeft') {
      event.preventDefault();
      nextTab = order[(idx - 1 + order.length) % order.length];
    } else if (event.key === 'Home') {
      event.preventDefault();
      nextTab = order[0];
    } else if (event.key === 'End') {
      event.preventDefault();
      nextTab = order[order.length - 1];
    }

    if (nextTab) {
      this.selectTab(nextTab);
      if (typeof document !== 'undefined') {
        document.getElementById(`settings-tab-${nextTab}`)?.focus();
      }
    }
  }

  selectTheme(nextTheme: 'light' | 'dark'): void {
    if (this.currentTheme() === nextTheme && this.settings().theme === nextTheme) return;
    const previous = this.settings();
    this.theme.setTheme(nextTheme);
    this.settings.update((state) => ({ ...state, theme: nextTheme }));
    this.persistPatch({ theme: nextTheme }, previous);
  }

  toggleThemeSwitch(): void {
    this.selectTheme(this.currentTheme() === 'dark' ? 'light' : 'dark');
  }

  selectLanguage(nextLang: 'es' | 'en'): void {
    if (this.currentLanguage() === nextLang && this.settings().language === nextLang) return;
    const previous = this.settings();
    void this.translation.setLanguage(nextLang);
    this.settings.update((state) => ({ ...state, language: nextLang }));
    this.persistPatch({ language: nextLang }, previous);
  }

  isNotificationEnabled(key: EmailNotificationKey): boolean {
    return Boolean(this.settings().notifications.email[key]);
  }

  toggleNotification(key: EmailNotificationKey): void {
    const previous = this.settings();
    const nextValue = !this.isNotificationEnabled(key);

    this.settings.update((state) => ({
      ...state,
      notifications: {
        ...state.notifications,
        email: {
          ...state.notifications.email,
          [key]: nextValue,
        },
      },
    }));

    this.persistPatch(
      {
        notifications: {
          email: { [key]: nextValue },
        },
      },
      previous,
    );
  }

  private persistPatch(patch: UpdateSettingsPatch, fallbackState: UserSettings): void {
    this.saving.set(true);
    this.settingsApi.updateSettings(patch).subscribe({
      next: (updated) => {
        this.settings.set({
          theme: updated.theme,
          language: updated.language,
          notifications: {
            email: {
              ...DEFAULT_USER_SETTINGS.notifications.email,
              ...(updated.notifications?.email ?? {}),
            },
          },
        });
        this.saving.set(false);
      },
      error: () => {
        this.settings.set(fallbackState);
        this.theme.setTheme(fallbackState.theme);
        if (fallbackState.language !== this.translation.currentLang()) {
          void this.translation.setLanguage(fallbackState.language);
        }
        this.saving.set(false);
        this.notifications.error(this.translation.translate('settings.saveError'));
      },
    });
  }
}
