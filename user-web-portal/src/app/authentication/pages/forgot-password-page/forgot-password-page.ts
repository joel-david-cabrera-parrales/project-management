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

  readonly step = signal<1 | 2>(1);
  readonly email = signal('');
  readonly code = signal('');
  readonly sending = signal(false);
  readonly verifying = signal(false);
  readonly emailError = signal<string | null>(null);
  readonly codeError = signal<string | null>(null);
  readonly serverError = signal<string | null>(null);

  get stepPercent(): number {
    return this.step() * 50;
  }

  get isValidEmail(): boolean {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.email().trim());
  }

  get isValidCode(): boolean {
    return /^\d{3}-\d{3}-\d{3}$/.test(this.code());
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
        next: () => {
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
