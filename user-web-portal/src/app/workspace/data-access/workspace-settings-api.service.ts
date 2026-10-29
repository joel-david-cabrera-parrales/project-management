import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceDetailApiResponse } from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceSettingsApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/workspace`;

  updateWorkspace(code: string, payload: { title: string; description: string; color: string; status?: 1 | 2 | 3 }): Observable<WorkspaceDetailApiResponse> {
    return this.http.patch<WorkspaceDetailApiResponse>(`${this.endpoint}/${code}`, payload);
  }

  deleteWorkspace(code: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${code}`);
  }
}
