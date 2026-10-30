import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, map, switchMap, throwError } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticationResponse, AuthenticationTypeCode, StoredUserProfile } from '../models/authentication.models';
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

  verifyCode(
    email: string,
    code: string,
  ): Observable<{ profile: StoredUserProfile; authenticationTypeCode: AuthenticationTypeCode }> {
    return this.http
      .post<AuthenticationResponse>(`${this.authUrl}/verify-reset-code`, {
        code: code.replace(/\D/g, ''),
      })
      .pipe(
        switchMap((response) => {
          const authenticationTypeCode = response.authenticationType?.code;
          if (!authenticationTypeCode) {
            return throwError(() => new Error('Authentication type is missing from the verification response'));
          }

          return this.session.establishSession(response, {
            userCode: response.user.userCode,
            profileCode: response.user.profileCode,
            email,
            fullName: response.user.name ?? email,
          }).pipe(map((profile) => ({ profile, authenticationTypeCode })));
        }),
      );
  }

  resetPassword(password: string): Observable<void> {
    return this.http.post<void>(`${this.authUrl}/reset-password`, { password });
  }
}
