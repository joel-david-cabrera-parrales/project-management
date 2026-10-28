import { Component, OnInit, inject } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../../services/auth.service';

@Component({
  selector: 'app-google-callback',
  template: `
    <div class="flex items-center justify-center min-h-screen bg-slate-900">
      <p class="text-gray-400 text-lg">Completando inicio de sesión...</p>
    </div>
  `,
})
export class GoogleCallback implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);

  ngOnInit() {
    const token = this.route.snapshot.queryParamMap.get('token');

    if (!token) {
      this.router.navigate(['/auth/login']);
      return;
    }

    this.authService.handleGoogleCallback(token);
    this.router.navigate(['/workspace']);
  }
}