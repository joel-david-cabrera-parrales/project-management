import { Component, inject, signal } from '@angular/core';
import { ActivatedRoute, Router, RouterLink } from '@angular/router';
import { AuthenticationSessionService } from '../../services/authentication-session.service';
import { StorageService } from '../../../shared/services/storage.service';

@Component({
  selector: 'app-authentication-callback-page',
  imports: [RouterLink],
  templateUrl: './authentication-callback-page.html',
  styleUrl: './authentication-callback-page.css',
})
export class AuthenticationCallbackPage {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly session = inject(AuthenticationSessionService);
  private readonly storage = inject(StorageService);

  readonly error = signal(false);

  constructor() {
    const token = this.route.snapshot.queryParamMap.get('token');
    if (!token) {
      this.error.set(true);
      return;
    }

    this.session.completeGoogleSignIn(token).subscribe({
      next: () => void this.router.navigateByUrl('/workspace'),
      error: () => {
        this.storage.removeAll();
        this.error.set(true);
      },
    });
  }
}
