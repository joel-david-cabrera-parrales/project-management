import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, catchError, of, tap } from 'rxjs';
import { LabelResponse } from '../interfaces/workspace-response.interface';
import { Label } from '../models/workspace.models';
import { WorkspaceMapper } from '../mappers/workspace.mapper';
import { NotificationService } from '../../shared/services/notification.service';
import { WorkspaceStateService } from './workspace-state-service';

@Injectable({
  providedIn: 'root',
})
export class LabelService {
  private readonly baseUrl = environment.apiUrl + '/label';
  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private readonly workspaceState = inject(WorkspaceStateService);

  getWorkspaceLabels(workspaceCode: string) {
    return this.http
      .get<LabelResponse[]>(`${this.baseUrl}/workspace/${workspaceCode}`)
      .pipe(
        map((response) => WorkspaceMapper.toLabels(response)),
        catchError(() => of([])),
      );
  }

  create(dto: { name: string; color: string; workspaceCode: string }) {
    return this.http.post<LabelResponse>(`${this.baseUrl}`, dto).pipe(
      map((response) => WorkspaceMapper.toLabel(response)),
      tap(() => this.notification.success('Label created')),
      catchError(() => of(null)),
    );
  }

  updateLabel(id: number, dto: { name?: string; color?: string }) {
    return this.http.patch<LabelResponse>(`${this.baseUrl}/${id}${this.wsParam}`, dto).pipe(
      map((response) => WorkspaceMapper.toLabel(response)),
      tap(() => this.notification.success('Label updated')),
      catchError(() => of(null)),
    );
  }

  deleteLabel(id: number) {
    return this.http.delete(`${this.baseUrl}/${id}${this.wsParam}`).pipe(
      tap(() => this.notification.success('Label deleted')),
      catchError(() => of(null)),
    );
  }

  private get wsParam(): string {
    const code = this.workspaceState.workspaceValue?.id;
    return code ? `?ws=${code}` : '';
  }
}
