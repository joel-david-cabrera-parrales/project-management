import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { CommonModule } from '@angular/common';
import { HttpClient } from '@angular/common/http';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-forgot-password',
  imports: [RouterLink, FormsModule, CommonModule, TranslatePipe],
  templateUrl: './forgot-password.html',
  styleUrl: './forgot-password.css',
})
export class ForgotPassword {
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  private readonly authService = inject(AuthService);

  protected step = signal(1);
  protected maxSteps = 3;

  protected email = signal('');
  protected code = signal('');
  protected newPassword = signal('');
  protected confirmPassword = signal('');

  protected sending = signal(false);
  protected verifying = signal(false);
  protected resetting = signal(false);
  protected success = signal(false);

  protected codeError = signal('');
  protected passwordError = signal('');

  protected emailSent = signal(false);

  get stepPercent(): number {
    return (this.step() / this.maxSteps) * 100;
  }

  get passwordStrength(): number {
    const pwd = this.newPassword();
    if (!pwd) return 0;
    let score = 0;
    if (pwd.length >= 8) score += 25;
    if (pwd.length >= 12) score += 10;
    if (/[A-Z]/.test(pwd)) score += 15;
    if (/[a-z]/.test(pwd)) score += 15;
    if (/[0-9]/.test(pwd)) score += 15;
    if (/[^A-Za-z0-9]/.test(pwd)) score += 20;
    return Math.min(score, 100);
  }

  get passwordStrengthLabel(): string {
    const s = this.passwordStrength;
    if (s < 25) return 'auth.forgotPassword.errors.weak';
    if (s < 50) return 'auth.forgotPassword.errors.fair';
    if (s < 75) return 'auth.forgotPassword.errors.strong';
    return 'auth.forgotPassword.errors.veryStrong';
  }

  get passwordStrengthColor(): string {
    const s = this.passwordStrength;
    if (s < 25) return '#ef4444';
    if (s < 50) return '#f59e0b';
    if (s < 75) return '#3b82f6';
    return '#22c55e';
  }

  get passwordsMatch(): boolean {
    return this.newPassword().length > 0 && this.newPassword() === this.confirmPassword();
  }

  get isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email());
  }

  get isValidCode(): boolean {
    return /^\d{3}-\d{3}-\d{3}$/.test(this.code());
  }

  onCodeInput(input: HTMLInputElement): void {
    const raw = input.value.replace(/[^\d]/g, '').slice(0, 9);
    let formatted = raw;
    if (raw.length >= 6) {
      formatted = raw.slice(0, 3) + '-' + raw.slice(3, 6) + '-' + raw.slice(6);
    } else if (raw.length >= 3) {
      formatted = raw.slice(0, 3) + '-' + raw.slice(3);
    }
    input.value = formatted;
    this.code.set(formatted);
    this.codeError.set('');
  }

  requestCode(): void {
    if (!this.isValidEmail) return;
    this.sending.set(true);

    this.authService.sendPasswordResetCode(this.email()).subscribe({
      next: () => {
        this.sending.set(false);
        this.emailSent.set(true);
        this.step.set(2);
      },
      error: () => {
        this.sending.set(false);
      },
    });
  }

  verifyCode(): void {
    if (!this.isValidCode) {
      this.codeError.set('auth.forgotPassword.errors.invalidCode');
      return;
    }
    this.verifying.set(true);

    this.authService.verifyPasswordResetCode(this.email(), this.code()).subscribe({
      next: (res) => {
        this.verifying.set(false);
        if (!res || !res.token) return this.notification.warning('Token not recived. Please try again.');
        this.step.set(3);
        return;
      },
      error: () => {
        this.verifying.set(false);
        this.codeError.set('Invalid code. Please try again.');
      },
    });
  }

  resendCode(): void {
    this.sending.set(true);
    this.authService.sendPasswordResetCode(this.email()).subscribe({
      next: () => {
        this.sending.set(false);
      },
      error: () => this.sending.set(false),
    });
  }

  resetPassword(): void {
    const pwd = this.newPassword();
    if (pwd.length < 8) {
      this.passwordError.set('auth.forgotPassword.errors.passwordTooShort');
      return;
    }
    if (!this.passwordsMatch) {
      this.passwordError.set('auth.forgotPassword.errors.passwordMismatch');
      return;
    }
    this.resetting.set(true);
    this.authService.resetPassword(this.newPassword()).subscribe({
      next: () => {
        this.resetting.set(false);
        this.success.set(true);
      },
      error: () => {
        this.resetting.set(false);
        this.passwordError.set('An error occurred. Please try again.');
      },
    });
  }

  prevStep(): void {
    if (this.step() > 1) this.step.update((s) => s - 1);
  }

  nextStep(): void {
    if (this.step() === 1) {
      this.requestCode();
    } else if (this.step() === 2) {
      this.verifyCode();
    } else {
      this.resetPassword();
    }
  }

  goToLogin(): void {
    this.router.navigate(['/auth', 'login']);
  }
}
