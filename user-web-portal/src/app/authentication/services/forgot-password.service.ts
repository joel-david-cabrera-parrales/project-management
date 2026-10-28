import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticationResponse, StoredUserProfile } from '../models/authentication.models';
import { AuthenticationSessionService } from './authentication-session.service';

@Injectable({
  providedIn: 'root',
})
export class ForgotPasswordService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthenticationSessionService);
  private readonly authUrl = `${environment.apiUrl}/auth`;

  requestCode(email: string): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/forgot-password`, { email });
  }

  verifyCode(email: string, code: string): Observable<StoredUserProfile> {
    return this.http
      .post<AuthenticationResponse>(`${this.authUrl}/verify-reset-code`, {
        code: code.replace(/\D/g, ''),
      })
      .pipe(
        switchMap((response) =>
          this.session.establishSession(response, {
            userCode: response.user.userCode,
            profileCode: response.user.profileCode,
            email,
            fullName: response.user.name ?? email,
          }),
        ),
      );
  }
}
