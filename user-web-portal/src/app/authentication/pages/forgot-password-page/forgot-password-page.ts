import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { ForgotPasswordService } from '../../services/forgot-password.service';

@Component({
  selector: 'app-forgot-password-page',
  imports: [RouterLink, TranslatePipe],
  templateUrl: './forgot-password-page.html',
  styleUrl: './forgot-password-page.css',
})
export class ForgotPasswordPage {
  private readonly forgotPasswordService = inject(ForgotPasswordService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);
  private readonly notification = inject(NotificationService);

  readonly step = signal<1 | 2 | 3>(1);
  readonly email = signal('');
  readonly code = signal('');
  readonly newPassword = signal('');
  readonly confirmPassword = signal('');
  readonly showNewPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly sending = signal(false);
  readonly verifying = signal(false);
  readonly resetting = signal(false);
  readonly emailError = signal<string | null>(null);
  readonly codeError = signal<string | null>(null);
  readonly passwordError = signal<string | null>(null);
  readonly serverError = signal<string | null>(null);

  get stepPercent(): number {
    return (this.step() / 3) * 100;
  }

  get isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim());
  }

  get isValidCode(): boolean {
    return /^\d{3}-\d{3}-\d{3}$/.test(this.code());
  }

  get passwordsMatch(): boolean {
    return this.newPassword().length > 0 && this.newPassword() === this.confirmPassword();
  }

  requestCode(): void {
    this.emailError.set(null);
    this.serverError.set(null);

    if (!this.isValidEmail) {
      this.emailError.set('auth.forgotPassword.errors.invalidEmail');
      return;
    }

    const email = this.email().trim().toLowerCase();
    this.sending.set(true);
    this.forgotPasswordService
      .requestCode(email)
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => {
          this.email.set(email);
          this.code.set('');
          this.step.set(2);
        },
        error: (error: unknown) => this.serverError.set(this.errorMessage(error)),
      });
  }

  onCodeInput(input: HTMLInputElement): void {
    const digits = input.value.replace(/\D/g, '').slice(0, 9);
    const formatted = digits.length > 6
      ? `${digits.slice(0, 3)}-${digits.slice(3, 6)}-${digits.slice(6)}`
      : digits.length > 3
        ? `${digits.slice(0, 3)}-${digits.slice(3)}`
        : digits;

    input.value = formatted;
    this.code.set(formatted);
    this.codeError.set(null);
    this.serverError.set(null);
  }

  verifyCode(): void {
    this.codeError.set(null);
    this.serverError.set(null);

    if (!this.isValidCode) {
      this.codeError.set('auth.forgotPassword.errors.invalidCode');
      return;
    }

    this.verifying.set(true);
    this.forgotPasswordService
      .verifyCode(this.email(), this.code())
      .pipe(finalize(() => this.verifying.set(false)))
      .subscribe({
        next: ({ authenticationTypeCode }) => {
          if (authenticationTypeCode === 'USER') {
            this.step.set(3);
            return;
          }

          this.notification.success('notifications.codeVerified');
          void this.router.navigateByUrl('/workspace');
        },
        error: (error: unknown) => this.serverError.set(this.errorMessage(error)),
      });
  }

  resendCode(): void {
    this.serverError.set(null);
    this.sending.set(true);
    this.forgotPasswordService
      .requestCode(this.email())
      .pipe(finalize(() => this.sending.set(false)))
      .subscribe({
        next: () => this.notification.success('notifications.codeSent'),
        error: (error: unknown) => this.serverError.set(this.errorMessage(error)),
      });
  }

  resetPassword(): void {
    this.passwordError.set(null);
    if (this.newPassword().length < 8) {
      this.passwordError.set('auth.forgotPassword.errors.passwordTooShort');
      return;
    }
    if (!this.passwordsMatch) {
      this.passwordError.set('auth.forgotPassword.errors.passwordMismatch');
      return;
    }

    this.resetting.set(true);
    this.forgotPasswordService
      .resetPassword(this.newPassword())
      .pipe(finalize(() => this.resetting.set(false)))
      .subscribe({
        next: () => {
          this.notification.success('notifications.passwordReset');
          void this.router.navigateByUrl('/workspace');
        },
        error: (error: unknown) => this.serverError.set(this.errorMessage(error)),
      });
  }

  backToEmail(): void {
    this.serverError.set(null);
    this.codeError.set(null);
    this.step.set(1);
  }

  private errorMessage(error: unknown): string {
    if (error instanceof HttpErrorResponse) {
      const message = error.error?.message;
      if (Array.isArray(message)) return message.join(' ');
      if (typeof message === 'string') return message;
    }
    return this.translation.translate('notifications.unexpectedError');
  }
}
