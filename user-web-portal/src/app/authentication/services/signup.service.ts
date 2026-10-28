import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable, switchMap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticationResponse, SignupRequest, StoredUserProfile } from '../models/authentication.models';
import { AuthenticationSessionService } from './authentication-session.service';

@Injectable({
  providedIn: 'root',
})
export class SignupService {
  private readonly http = inject(HttpClient);
  private readonly session = inject(AuthenticationSessionService);
  private readonly registerUrl = `${environment.apiUrl}/auth/register`;

  signUp(request: SignupRequest): Observable<StoredUserProfile> {
    return this.http.post<AuthenticationResponse>(this.registerUrl, request).pipe(
      switchMap((response) =>
        this.session.establishSession(response, {
          userCode: response.user.userCode,
          profileCode: response.user.profileCode,
          firstName: request.firstName,
          secondName: request.secondName ?? null,
          firstSurname: request.firstSurname,
          secondSurname: request.secondSurname ?? null,
          email: request.email,
          phone: request.phone,
          dateBirth: request.dateBirth,
          fullName: `${request.firstName} ${request.firstSurname}`.trim(),
          createdAt: response.user.createdAt ?? null,
        }),
      ),
    );
  }
}
