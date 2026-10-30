import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { AuthenticationType } from '../models/authentication.models';

@Injectable({ providedIn: 'root' })
export class AuthenticationTypesService {
  private readonly http = inject(HttpClient);

  getTypes(): Observable<AuthenticationType[]> {
    return this.http.get<AuthenticationType[]>(`${environment.apiUrl}/common/authentication-types`);
  }
}
