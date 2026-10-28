import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceLabel } from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceLabelsApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/label`;

  getLabels(workspaceCode: string): Observable<WorkspaceLabel[]> {
    return this.http.get<WorkspaceLabel[]>(`${this.endpoint}/workspace/${workspaceCode}`);
  }

  createLabel(workspaceCode: string, payload: Pick<WorkspaceLabel, 'name' | 'color'>): Observable<WorkspaceLabel> {
    return this.http.post<WorkspaceLabel>(this.endpoint, { ...payload, workspaceCode });
  }

  updateLabel(workspaceCode: string, labelId: number, payload: Partial<Pick<WorkspaceLabel, 'name' | 'color'>>): Observable<WorkspaceLabel> {
    const params = new HttpParams().set('ws', workspaceCode);
    return this.http.patch<WorkspaceLabel>(`${this.endpoint}/${labelId}`, payload, { params });
  }

  deleteLabel(workspaceCode: string, labelId: number): Observable<WorkspaceLabel> {
    const params = new HttpParams().set('ws', workspaceCode);
    return this.http.delete<WorkspaceLabel>(`${this.endpoint}/${labelId}`, { params });
  }
}
