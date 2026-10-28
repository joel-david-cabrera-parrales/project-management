import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { map, catchError, of, tap } from 'rxjs';
import { TaskListResponse } from '../interfaces/workspace-response.interface';
import { WorkspaceMapper } from '../mappers/workspace.mapper';
import { NotificationService } from '../../shared/services/notification.service';
import { WorkspaceStateService } from './workspace-state-service';
import { CreateListDto } from '../models/workspace.models';

@Injectable({
  providedIn: 'root',
})
export class TaskListService {
  private readonly baseUrl = environment.apiUrl + '/task-list';

  private http = inject(HttpClient);
  private notification = inject(NotificationService);
  private readonly workspaceState = inject(WorkspaceStateService);

  createList(dto: CreateListDto) {
    return this.http.post<TaskListResponse>(this.baseUrl, dto).pipe(
      map((response) => WorkspaceMapper.toTaskList(response)),
      tap(() => {
        this.notification.success('List created');
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  updateTitle(id: number, title: string) {
    return this.http.patch<TaskListResponse>(`${this.baseUrl}/${id}`, { title }).pipe(
      map((response) => WorkspaceMapper.toTaskList(response)),
      tap(() => {
        this.notification.success('List renamed');
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteList(id: number) {
    return this.http.delete<void>(`${this.baseUrl}/${id}`).pipe(
      tap(() => {
        this.notification.success('List deleted');
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  private handleError(error: HttpErrorResponse) {
    switch (error.status) {
      case 400:
      case 401:
        this.notification.error(error.error.message);
        break;
      case 404:
        this.notification.error(error.error.message);
        break;
      default:
        this.notification.error('Error inesperado');
        break;
    }
  }
}
