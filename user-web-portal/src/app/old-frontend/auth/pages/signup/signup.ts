import { Component, inject, signal } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { environment } from '../../../../../environments/environment';
import { NotificationService } from '../../../shared/services/notification.service';
import { AuthService } from '../../services/auth.service';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { CreateNewProfile } from '../../interfaces/create-new-profile.interface';
import { CommonModule } from '@angular/common';

@Component({
  selector: 'app-signup',
  imports: [RouterLink, CommonModule, ReactiveFormsModule],
  templateUrl: './signup.html',
  styleUrl: './signup.css',
})
export class Signup {
  public readonly appName = environment.appName;
  private readonly authService = inject(AuthService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);

  private readonly fb = inject(FormBuilder);

  public signupForm = this.fb.group({
    firstName: ['', Validators.required],
    secondName: ['', Validators.required],
    firstSurname: ['', Validators.required],
    secondSurname: ['', Validators.required],
    dateBirth: ['', Validators.required],
    phone: ['', Validators.required],
    email: ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submitting = signal(false);

  public onSubmit() {
    if (this.signupForm.invalid) {
      this.notification.warning('Por favor, complete todos los campos');
      return;
    }

    const formValues = this.signupForm.value;

    const firstName = formValues.firstName!;
    const firstSurname = formValues.firstSurname!;
    const secondName = formValues.secondName!;
    const secondSurname = formValues.secondSurname!;
    const dateBirth = formValues.dateBirth!;
    const email = formValues.email!;
    const phone = [formValues.phone!];
    const username = email;
    const password = formValues.password!;

    const newProfile: CreateNewProfile = {
      firstName,
      firstSurname,
      secondName,
      secondSurname,
      dateBirth,
      email,
      phone,
      username,
      password,
    };

    this.submitting.set(true);
    this.authService.registerProfile(newProfile).subscribe({
      next: () => {
        this.submitting.set(false);
        this.notification.success('Perfil registrado exitosamente');
        this.router.navigate(['/workspace']);
      },
      error: () => {
        this.submitting.set(false);
        this.notification.error('Error al registrar el perfil');
      },
    });
  }

  public googleRegister() {
    window.location.href = `${environment.apiUrl}/auth/google`;
  }

  public microsoftRegister() {
    window.location.href = `${environment.apiUrl}/auth/microsoft`;
  }
}
