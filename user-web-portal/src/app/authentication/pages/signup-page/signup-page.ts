import { HttpErrorResponse } from '@angular/common/http';
import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { finalize } from 'rxjs';
import { environment } from '../../../../environments/environment';
import { TranslatePipe } from '../../../shared/pipes/translate.pipe';
import { TranslationService } from '../../../shared/services/translation.service';
import { AuthenticationTypeCode, SignupRequest } from '../../models/authentication.models';
import { SignupService } from '../../services/signup.service';
import { AuthenticationTypesService } from '../../services/authentication-types.service';

const passwordMatchValidator = (control: import('@angular/forms').AbstractControl) => {
  const password = control.get('password')?.value;
  const confirmPassword = control.get('confirmPassword')?.value;
  if (!password || !confirmPassword || password === confirmPassword) return null;
  return { passwordMismatch: true };
};

@Component({
  selector: 'app-signup-page',
  imports: [ReactiveFormsModule, RouterLink, TranslatePipe],
  templateUrl: './signup-page.html',
  styleUrl: './signup-page.css',
})
export class SignupPage {
  private readonly formBuilder = inject(FormBuilder);
  private readonly signupService = inject(SignupService);
  private readonly router = inject(Router);
  private readonly translation = inject(TranslationService);
  private readonly authenticationTypesService = inject(AuthenticationTypesService);

  readonly appName = environment.appName;
  readonly submitting = signal(false);
  readonly showPassword = signal(false);
  readonly showConfirmPassword = signal(false);
  readonly serverError = signal<string | null>(null);
  readonly today = new Date(Date.now() - new Date().getTimezoneOffset() * 60_000).toISOString().slice(0, 10);
  readonly availableAuthenticationTypes = signal<Set<AuthenticationTypeCode>>(new Set(['GOOGLE', 'MICROSOFT']));

  constructor() {
    this.authenticationTypesService.getTypes().subscribe({
      next: (types) => this.availableAuthenticationTypes.set(new Set(types.map((type) => type.code))),
      error: () => this.availableAuthenticationTypes.set(new Set(['GOOGLE', 'MICROSOFT'])),
    });
  }

  hasAuthenticationType(type: AuthenticationTypeCode): boolean {
    return this.availableAuthenticationTypes().has(type);
  }

  readonly form = this.formBuilder.nonNullable.group(
    {
      firstName: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      secondName: ['', [Validators.maxLength(50)]],
      firstSurname: ['', [Validators.required, Validators.minLength(2), Validators.maxLength(50)]],
      secondSurname: ['', [Validators.maxLength(50)]],
      dateBirth: ['', Validators.required],
      phone: ['', [Validators.required, Validators.minLength(7), Validators.maxLength(30)]],
      email: ['', [Validators.required, Validators.email]],
      password: ['', [Validators.required, Validators.minLength(8), Validators.maxLength(50)]],
      confirmPassword: ['', Validators.required],
      acceptTerms: [false, Validators.requiredTrue],
    },
    { validators: passwordMatchValidator },
  );

  fieldErrorKey(field: keyof typeof this.form.controls): string | null {
    const control = this.form.controls[field];
    if (!control.touched && !control.dirty) return null;
    if (control.hasError('required')) return 'auth.validation.required';
    if (control.hasError('email')) return 'auth.validation.emailInvalid';
    if (control.hasError('minlength')) {
      return field === 'password' ? 'auth.validation.passwordMinLength' : 'auth.validation.valueTooShort';
    }
    if (control.hasError('maxlength')) return 'auth.validation.valueTooLong';
    if (control.hasError('requiredTrue')) return 'auth.validation.termsRequired';
    return null;
  }

  passwordMismatch(): boolean {
    return this.form.hasError('passwordMismatch') && this.form.controls.confirmPassword.touched;
  }

  onSubmit(): void {
    this.serverError.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const values = this.form.getRawValue();
    const email = values.email.trim().toLowerCase();
    const request: SignupRequest = {
      firstName: values.firstName.trim(),
      secondName: values.secondName.trim() || undefined,
      firstSurname: values.firstSurname.trim(),
      secondSurname: values.secondSurname.trim() || undefined,
      dateBirth: values.dateBirth,
      email,
      phone: [values.phone.trim()],
      username: email,
      password: values.password,
    };

    this.submitting.set(true);
    this.signupService
      .signUp(request)
      .pipe(finalize(() => this.submitting.set(false)))
      .subscribe({
        next: () => void this.router.navigateByUrl('/workspace'),
        error: (error: unknown) => this.serverError.set(this.errorMessage(error)),
      });
  }

  googleSignUp(): void {
    window.location.assign(`${environment.apiUrl}/auth/google`);
  }

  microsoftSignUp(): void {
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
