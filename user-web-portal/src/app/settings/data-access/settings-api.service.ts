import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { UpdateSettingsPatch, UserSettings } from '../models/settings.models';

@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getSettings(): Observable<UserSettings> {
    return this.http.get<UserSettings>(`${this.baseUrl}/profile/settings`);
  }

  updateSettings(patch: UpdateSettingsPatch): Observable<UserSettings> {
    return this.http.patch<UserSettings>(`${this.baseUrl}/profile/settings`, patch);
  }
}
