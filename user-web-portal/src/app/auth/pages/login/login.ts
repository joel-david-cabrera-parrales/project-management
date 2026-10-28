import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { AuthService } from '../../services/auth.service';
import { CommonModule } from '@angular/common';
import { NotificationService } from '../../../shared/services/notification.service';
import { environment } from '../../../../environments/environment';

@Component({
  selector: 'app-login',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './login.html',
  styleUrl: './login.css',
})
export class Login {
  private readonly authService = inject(AuthService);
  private readonly fb = inject(FormBuilder);
  private readonly router = inject(Router);
  private readonly notification = inject(NotificationService);
  public readonly appName = environment.appName;

  public loginForm = this.fb.group({
    username: ['', Validators.required],
    password: ['', Validators.required],
  });

  submitting = signal(false);

  public onSubmit() {
    if (this.loginForm.invalid) {
      this.loginForm.markAllAsTouched();
      this.notification.warning('Please fill in all fields');
      return;
    }

    const payload = {
      username: this.loginForm.value.username || '',
      password: this.loginForm.value.password || '',
    };

    this.submitting.set(true);
    this.authService.login(payload.username, payload.password).subscribe({
      next: () => {
        this.submitting.set(false);
        this.router.navigate(['/workspace']);
      },
      error: () => this.submitting.set(false),
    });
  }

  public googleLogin() {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  public microsoftLogin() {
    window.location.href = `${environment.apiUrl}/auth/microsoft`;
  }
}
