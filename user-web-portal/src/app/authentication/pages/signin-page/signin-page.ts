import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { SigninService } from '../../services/signin.service';

@Component({
  selector: 'app-signin-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './signin-page.html',
  styleUrl: './signin-page.css',
})
export class SigninPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly signinService = inject(SigninService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);

  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly appName = environment.appName;

  readonly form = this.formBuilder.nonNullable.group({
    email: ['', [Validators.required, Validators.email]],
    password: ['', [Validators.required, Validators.minLength(8)]],
  });

  get emailControl() {
    return this.form.controls.email;
  }

  get passwordControl() {
    return this.form.controls.password;
  }

  emailErrorKey(): string | null {
    if (!this.emailControl.touched && !this.emailControl.dirty) return null;
    if (this.emailControl.hasError('required')) return 'auth.validation.emailRequired';
    if (this.emailControl.hasError('email')) return 'auth.validation.emailInvalid';
    return null;
  }

  passwordErrorKey(): string | null {
    if (!this.passwordControl.touched && !this.passwordControl.dirty) return null;
    if (this.passwordControl.hasError('required')) return 'auth.validation.passwordRequired';
    if (this.passwordControl.hasError('minlength')) return 'auth.validation.passwordMinLength';
    return null;
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const { email, password } = this.form.getRawValue();
    this.submitting.set(true);

    this.signinService
      .signIn(email.trim(), password)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/workspace'),
        error: (error: unknown) => this.serverError.set(this.errorMessage(error)),
      });
  }

  googleSignIn(): void {
    window.location.assign(`${environment.apiUrl}/auth/google`);
  }

  microsoftSignIn(): void {
    window.location.assign(`${environment.apiUrl}/auth/microsoft`);
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
