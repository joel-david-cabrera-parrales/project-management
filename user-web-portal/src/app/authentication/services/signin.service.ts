import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticationResponse, StoredUserProfile } from '../models/authentication.models';
import { AuthenticationSessionService } from './authentication-session.service';

@Injectable({
  providedIn: 'root',
})
export class SigninService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthenticationSessionService);
  private readonly loginUrl = `${environment.apiUrl}/auth/login`;

  signIn(email: string, password: string): Observable<StoredUserProfile> {
    return this.http
      .post<AuthenticationResponse>(this.loginUrl, { username: email, password })
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
