import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceListMapper } from '../models/workspace-list.mapper';
import {
  CreateWorkspacePayload,
  WorkspaceListApiResponse,
  WorkspaceListItem,
} from '../models/workspace-list.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceListApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/workspace`;

  getWorkspaces(): Observable<WorkspaceListItem[]> {
    return this.http
      .get<WorkspaceListApiResponse[]>(this.endpoint)
      .pipe(map((responses) => WorkspaceListMapper.toWorkspaceListItems(responses)));
  }

  createWorkspace(payload: CreateWorkspacePayload): Observable<WorkspaceListItem> {
    return this.http
      .post<WorkspaceListApiResponse>(this.endpoint, payload)
      .pipe(map((response) => WorkspaceListMapper.toWorkspaceListItem(response)));
  }
}
