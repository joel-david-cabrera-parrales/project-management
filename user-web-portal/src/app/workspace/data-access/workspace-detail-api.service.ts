import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceDetailMapper } from '../models/workspace-detail.mapper';
import { WorkspaceDetail, WorkspaceDetailApiResponse } from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceDetailApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/workspace`;

  getWorkspace(code: string): Observable<WorkspaceDetail> {
    return this.http
      .get<WorkspaceDetailApiResponse>(`${this.endpoint}/${code}`)
      .pipe(map(WorkspaceDetailMapper.toWorkspaceDetail));
  }
}
