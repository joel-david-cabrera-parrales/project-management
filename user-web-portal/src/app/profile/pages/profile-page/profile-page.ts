import { Component, computed, ElementRef, inject, OnInit, signal, ViewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { NotificationService } from '../../../shared/services/notification.service';
import { StorageService } from '../../../shared/services/storage.service';
import { TranslationService } from '../../../shared/services/translation.service';
import { ProfileApiService } from '../../data-access/profile-api.service';
import {
  ChangePasswordRequest,
  mapToUserProfile,
  UpdateProfileRequest,
  UserProfile,
} from '../../models/profile.models';

@Component({
  selector: 'app-profile-page',
  imports: [FormsModule, RouterLink, TranslatePipe],
  templateUrl: './profile-page.html',
  styleUrl: './profile-page.css',
})
export class ProfilePage implements OnInit {
  private readonly profileApi = inject(ProfileApiService);
  private readonly storage = inject(StorageService);
  private readonly notifications = inject(NotificationService);
  readonly translation = inject(TranslationService);

  @ViewChild('photoInput') photoInput?: ElementRef<HTMLInputElement>;

  readonly profile = signal<UserProfile | null>(null);
  readonly loading = signal(true);
  readonly loadError = signal(false);

  readonly firstName = signal('');
  readonly secondName = signal('');
  readonly firstSurname = signal('');
  readonly secondSurname = signal('');
  readonly phone = signal('');

  readonly savingProfile = signal(false);
  readonly profileSaved = signal(false);
  readonly profileError = signal('');

  readonly uploadingPhoto = signal(false);
  readonly uploadError = signal('');

  readonly currentPassword = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly showCurrentPassword = signal(false);
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly savingPassword = signal(false);
  readonly passwordSaved = signal(false);
  readonly passwordError = signal('');

  readonly copiedField = signal<'userCode' | 'profileCode' | null>(null);

  readonly canSaveProfile = computed(() => {
    return (
      !this.savingProfile() &&
      this.firstName().trim().length >= 2 &&
      this.firstSurname().trim().length >= 2
    );
  });

  readonly passwordStrength = computed(() => {
    const pw = this.newPassword();
    if (!pw) return 0;
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;
    return score;
  });

  readonly passwordStrengthKey = computed(() => {
    const score = this.passwordStrength();
    if (score === 0) return '';
    if (score <= 25) return 'profile.security.strength.weak';
    if (score <= 50) return 'profile.security.strength.fair';
    if (score <= 75) return 'profile.security.strength.good';
    return 'profile.security.strength.strong';
  });

  readonly passwordStrengthTone = computed(() => {
    const score = this.passwordStrength();
    if (score <= 25) return 'weak';
    if (score <= 50) return 'fair';
    if (score <= 75) return 'good';
    return 'strong';
  });

  readonly passwordsMatch = computed(() => {
    return (
      this.newPassword().length >= 8 &&
      this.newPassword() === this.confirmPassword()
    );
  });

  readonly canChangePassword = computed(() => {
    return (
      !this.savingPassword() &&
      this.currentPassword().trim().length > 0 &&
      this.newPassword().length >= 8 &&
      this.passwordsMatch()
    );
  });

  readonly formattedMemberSince = computed(() => {
    const dateStr = this.profile()?.createdAt;
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    const locale = this.translation.currentLang() === 'en' ? 'en-US' : 'es-ES';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  });

  readonly formattedDateBirth = computed(() => {
    const dateStr = this.profile()?.dateBirth;
    if (!dateStr) return '—';
    const date = new Date(dateStr);
    if (Number.isNaN(date.getTime())) return '—';
    const locale = this.translation.currentLang() === 'en' ? 'en-US' : 'es-ES';
    return date.toLocaleDateString(locale, {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      timeZone: 'UTC',
    });
  });

  ngOnInit(): void {
    this.seedFromStorage();
    this.loadProfile();
  }

  loadProfile(): void {
    this.loading.set(true);
    this.loadError.set(false);
    this.profileApi.getMyProfile().subscribe({
      next: (loaded) => {
        this.applyProfile(loaded);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        if (!this.profile()) {
          this.loadError.set(true);
        }
      },
    });
  }

  triggerPhotoDialog(): void {
    if (this.uploadingPhoto()) return;
    this.photoInput?.nativeElement.click();
  }

  onPhotoSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set('');
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      this.uploadError.set(this.translation.translate('profile.photo.invalidType'));
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set(this.translation.translate('profile.photo.tooLarge'));
      input.value = '';
      return;
    }

    this.uploadingPhoto.set(true);
    this.profileApi.uploadProfilePhoto(file).subscribe({
      next: (updated) => {
        this.applyProfile(updated);
        this.uploadingPhoto.set(false);
        this.notifications.success(this.translation.translate('profile.photo.uploadSuccess'));
        input.value = '';
      },
      error: () => {
        this.uploadingPhoto.set(false);
        this.uploadError.set(this.translation.translate('profile.photo.uploadError'));
        input.value = '';
      },
    });
  }

  saveProfile(): void {
    if (!this.canSaveProfile()) {
      this.profileError.set(this.translation.translate('profile.personal.requiredNames'));
      return;
    }

    this.savingProfile.set(true);
    this.profileSaved.set(false);
    this.profileError.set('');

    const dto: UpdateProfileRequest = {
      firstName: this.firstName().trim(),
      secondName: this.secondName().trim() || undefined,
      firstSurname: this.firstSurname().trim(),
      secondSurname: this.secondSurname().trim() || undefined,
      phone: this.phone()
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean),
    };

    this.profileApi.updateMyProfile(dto).subscribe({
      next: (updated) => {
        const currentPhoto = this.profile()?.photo;
        this.applyProfile({
          ...updated,
          photo: updated.photo ?? currentPhoto ?? null,
        });
        this.savingProfile.set(false);
        this.profileSaved.set(true);
        this.notifications.success(this.translation.translate('profile.personal.saved'));
        setTimeout(() => this.profileSaved.set(false), 3000);
      },
      error: () => {
        this.savingProfile.set(false);
        this.profileError.set(this.translation.translate('profile.personal.saveError'));
      },
    });
  }

  changePassword(): void {
    if (!this.canChangePassword()) return;

    this.savingPassword.set(true);
    this.passwordSaved.set(false);
    this.passwordError.set('');

    const dto: ChangePasswordRequest = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    };

    this.profileApi.changePassword(dto).subscribe({
      next: () => {
        this.savingPassword.set(false);
        this.passwordSaved.set(true);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.notifications.success(this.translation.translate('profile.security.updated'));
        setTimeout(() => this.passwordSaved.set(false), 3000);
      },
      error: (err) => {
        this.savingPassword.set(false);
        const serverMessage =
          typeof err?.error?.message === 'string'
            ? err.error.message
            : this.translation.translate('profile.security.updateError');
        this.passwordError.set(serverMessage);
      },
    });
  }

  async copyIdentifier(field: 'userCode' | 'profileCode', value?: string | null): Promise<void> {
    if (!value || typeof navigator === 'undefined' || !navigator.clipboard) return;
    try {
      await navigator.clipboard.writeText(value);
      this.copiedField.set(field);
      setTimeout(() => {
        if (this.copiedField() === field) {
          this.copiedField.set(null);
        }
      }, 2000);
    } catch {
      this.copiedField.set(null);
    }
  }

  private seedFromStorage(): void {
    const cached = this.storage.getProfile();
    if (!cached) return;
    this.applyProfile(
      mapToUserProfile({
        userCode: cached.userCode,
        profileCode: cached.profileCode,
        firstName: cached.firstName ?? cached.fullName?.split(' ')[0] ?? '',
        secondName: cached.secondName ?? null,
        firstSurname: cached.firstSurname ?? cached.fullName?.split(' ').slice(1).join(' ') ?? '',
        secondSurname: cached.secondSurname ?? null,
        email: cached.email,
        phone: cached.phone ?? [],
        photo: cached.photo ?? null,
        dateBirth: cached.dateBirth ?? '',
        createdAt: cached.createdAt ?? '',
        fullName: cached.fullName || cached.email,
      }),
    );
  }

  private applyProfile(profile: UserProfile): void {
    this.profile.set(profile);
    this.firstName.set(profile.firstName ?? '');
    this.secondName.set(profile.secondName ?? '');
    this.firstSurname.set(profile.firstSurname ?? '');
    this.secondSurname.set(profile.secondSurname ?? '');
    this.phone.set((profile.phone ?? []).join(', '));
  }
}
