import { Component, inject, signal, effect, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ProfileService } from '../../services/profile.service';
import { Profile as ProfileModel, UpdateProfileDto, ChangePasswordDto } from '../../models/profile.models';
import { AuthService } from '../../../auth/services/auth.service';

@Component({
  selector: 'profile-page',
  imports: [RouterLink, FormsModule],
  templateUrl: './profile-page.html',
})
export class ProfilePageComponent {
  private readonly profileService = inject(ProfileService);
  private readonly authService = inject(AuthService);

  @ViewChild('fileInput') fileInput!: ElementRef<HTMLInputElement>;

  protected profile = signal<ProfileModel | null>(null);
  protected loading = signal(true);
  protected savingProfile = signal(false);
  protected savingPassword = signal(false);
  protected uploading = signal(false);
  protected uploadError = signal('');

  protected firstName = signal('');
  protected secondName = signal('');
  protected firstSurname = signal('');
  protected secondSurname = signal('');
  protected phone = signal('');

  protected currentPassword = signal('');
  protected newPassword = signal('');
  protected confirmPassword = signal('');

  protected profileSaved = signal(false);
  protected passwordChanged = signal(false);
  protected passwordError = signal('');

  protected showCurrentPassword = signal(false);
  protected showNewPassword = signal(false);
  protected showConfirmPassword = signal(false);

  constructor() {
    effect(() => {
      const p = this.profile();
      if (p) {
        this.firstName.set(p.firstName);
        this.secondName.set(p.secondName ?? '');
        this.firstSurname.set(p.firstSurname);
        this.secondSurname.set(p.secondSurname ?? '');
        this.phone.set(p.phone.join(', '));
      }
    });
  }

  ngOnInit() {
    this.loadProfile();
  }

  private loadProfile(): void {
    this.loading.set(true);
    this.profileService.getMyProfile().subscribe({
      next: (p) => {
        this.profile.set(p);
        this.loading.set(false);
      },
      error: () => this.loading.set(false),
    });
  }

  get fullName(): string {
    return this.profile()?.fullName ?? '';
  }

  get email(): string {
    return this.profile()?.email ?? '';
  }

  get dateBirth(): string {
    const p = this.profile();
    if (!p?.dateBirth) return '';
    return new Date(p.dateBirth).toLocaleDateString('es-ES', { year: 'numeric', month: 'long', day: 'numeric' });
  }

  get memberSince(): string {
    const p = this.profile();
    if (!p?.createdAt) return '';
    return new Date(p.createdAt).toLocaleDateString('es-ES', { year: 'numeric', month: 'long' });
  }

  get passwordStrength(): number {
    const pw = this.newPassword();
    let score = 0;
    if (pw.length >= 8) score += 25;
    if (/[A-Z]/.test(pw)) score += 25;
    if (/[0-9]/.test(pw)) score += 25;
    if (/[^A-Za-z0-9]/.test(pw)) score += 25;
    return score;
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s === 0) return '';
    if (s <= 25) return 'Weak';
    if (s <= 50) return 'Fair';
    if (s <= 75) return 'Good';
    return 'Strong';
  }

  get passwordStrengthColor(): string {
    const s = this.passwordStrength;
    if (s <= 25) return '#ef4444';
    if (s <= 50) return '#f59e0b';
    if (s <= 75) return '#3b82f6';
    return '#10b981';
  }

  get passwordsMatch(): boolean {
    return this.newPassword() === this.confirmPassword() && this.newPassword().length > 0;
  }

  onFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    this.uploadError.set('');

    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif'];
    if (!allowed.includes(file.type)) {
      this.uploadError.set('Invalid file type. Allowed: JPEG, PNG, WebP, GIF');
      input.value = '';
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      this.uploadError.set('File too large. Maximum size is 5MB');
      input.value = '';
      return;
    }

    this.uploading.set(true);
    this.profileService.uploadProfilePhoto(file).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.authService.refreshProfile();
        this.uploading.set(false);
        input.value = '';
      },
      error: () => {
        this.uploading.set(false);
        this.uploadError.set('Failed to upload photo');
        input.value = '';
      },
    });
  }

  onSaveProfile(): void {
    if (this.savingProfile()) return;
    this.profileSaved.set(false);
    this.savingProfile.set(true);

    const dto: UpdateProfileDto = {
      firstName: this.firstName(),
      secondName: this.secondName() || undefined,
      firstSurname: this.firstSurname(),
      secondSurname: this.secondSurname() || undefined,
      phone: this.phone().split(',').map((p) => p.trim()).filter(Boolean),
    };

    this.profileService.updateMyProfile(dto).subscribe({
      next: (updated) => {
        this.profile.set(updated);
        this.profileSaved.set(true);
        this.savingProfile.set(false);
        setTimeout(() => this.profileSaved.set(false), 3000);
      },
      error: () => this.savingProfile.set(false),
    });
  }

  onChangePassword(): void {
    if (this.savingPassword() || !this.passwordsMatch) return;
    this.passwordChanged.set(false);
    this.passwordError.set('');
    this.savingPassword.set(true);

    const dto: ChangePasswordDto = {
      currentPassword: this.currentPassword(),
      newPassword: this.newPassword(),
    };

    this.profileService.changePassword(dto).subscribe({
      next: () => {
        this.passwordChanged.set(true);
        this.currentPassword.set('');
        this.newPassword.set('');
        this.confirmPassword.set('');
        this.savingPassword.set(false);
        setTimeout(() => this.passwordChanged.set(false), 3000);
      },
      error: (err) => {
        this.passwordError.set(err.error?.message || 'Failed to change password');
        this.savingPassword.set(false);
      },
    });
  }
}
