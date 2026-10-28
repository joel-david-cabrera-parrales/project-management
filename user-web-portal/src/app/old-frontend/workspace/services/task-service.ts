import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { CreateTask } from '../interfaces/create-task.interface';
import { map, catchError, of, tap } from 'rxjs';
import { TaskResponse } from '../interfaces/workspace-response.interface';
import { WorkspaceMapper } from '../mappers/workspace.mapper';
import { NotificationService } from '../../shared/services/notification.service';
import { WorkspaceStateService } from './workspace-state-service';

@Injectable({
  providedIn: 'root',
})
export class TaskService {
  private readonly baseUrl = environment.apiUrl + '/task';

  private http = inject(HttpClient);

  private notification = inject(NotificationService);

  private readonly workspaceState = inject(WorkspaceStateService);

  create(newTask: CreateTask) {
    const url = `${this.baseUrl}`;
    return this.http.post<TaskResponse>(url, newTask).pipe(
      // Transformar la respuesta en Task
      map((response) => WorkspaceMapper.toTask(response)),
      tap(() => {
        this.notification.success('Task created successfully');

        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteTask(id: number) {
    const url = `${this.baseUrl}/${id}${this.wsParam}`;
    return this.http.delete<TaskResponse>(url).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      tap(() => {
        this.notification.success('Task deleted successfully');

        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  updateTask(id: number, dto: Partial<{ title: string; description: string; dateInit: string; dateEnd: string; completed: boolean; position: number; taskListId: number }>) {
    return this.http.patch<TaskResponse>(`${this.baseUrl}/${id}${this.wsParam}`, dto).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      tap(() => {
        this.notification.success('Task updated');
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  assignTask(taskId: number, workspaceMemberId: number) {
    return this.http.post<TaskResponse>(`${this.baseUrl}/${taskId}/assign${this.wsParam}`, { workspaceMemberId }).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      tap((task) => {
        this.workspaceState.updateCurrentTask(task);
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  unassignTask(taskId: number, assignmentId: number) {
    return this.http.delete<TaskResponse>(`${this.baseUrl}/${taskId}/assign/${assignmentId}${this.wsParam}`).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      tap((task) => {
        this.workspaceState.updateCurrentTask(task);
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  getTaskById(id: number) {
    const url = `${this.baseUrl}/${id}`;
    return this.http.get<TaskResponse>(url).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  addLabelToTask(taskId: number, labelId: number) {
    return this.http.post<TaskResponse>(`${this.baseUrl}/${taskId}/labels${this.wsParam}`, { labelId }).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      tap((task) => {
        this.workspaceState.updateCurrentTask(task);
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  reorderTasks(listId: number, taskIds: number[]) {
    return this.http.patch(`${this.baseUrl}/reorder${this.wsParam}`, { listId, taskIds }).pipe(
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  removeLabelFromTask(taskId: number, labelId: number) {
    return this.http.delete<TaskResponse>(`${this.baseUrl}/${taskId}/labels/${labelId}${this.wsParam}`).pipe(
      map((response) => WorkspaceMapper.toTask(response)),
      tap((task) => {
        this.workspaceState.updateCurrentTask(task);
        this.workspaceState.refreshWorkspace();
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  private get wsParam(): string {
    const code = this.workspaceState.workspaceValue?.id;
    return code ? `?ws=${code}` : '';
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
