import { inject, Injectable, signal } from '@angular/core';
import { environment } from '../../../../environments/environment';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { NotificationService } from '../../shared/services/notification.service';
import { WorkspaceResponse } from '../interfaces/workspace-response.interface';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { WorkspaceMapper } from '../mappers/workspace.mapper';
import { Workspace } from '../models/workspace.models';
import { CreateWorkspace } from '../interfaces/create-workspace.interface';
import { UpdateWorkspace } from '../interfaces/update-workspace.interface';

@Injectable({
  providedIn: 'root',
})
export class WorkspaceService {
  private readonly baseUrl = environment.apiUrl + '/workspace';
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);

  listWorkspaces = signal<Workspace[]>([]);

  public createWorkspace(newWorkspace: CreateWorkspace): Observable<Workspace> {
    const url = `${this.baseUrl}`;
    return this.http.post<WorkspaceResponse>(url, newWorkspace).pipe(
      map((response) => {
        this.notification.success('Workspace creado exitosamente');
        return WorkspaceMapper.toWorkspace(response);
      }),
      catchError((error) => {
        this.handleError(error);
        throw error;
      }),
    );
  }

  public updateWorkspace(workspaceCode: string, updatedWorkspace: UpdateWorkspace) {
    const url = `${this.baseUrl}/${workspaceCode}`;
    return this.http.patch<WorkspaceResponse>(url, updatedWorkspace).pipe(
      map((response) => {
        this.notification.success('Workspace actualizado exitosamente');
        return WorkspaceMapper.toWorkspace(response);
      }),
      catchError((error) => {
        this.handleError(error);
        throw error;
      }),
    );
  }

  public getAllWorkspacesByUserId(): Observable<Workspace[]> {
    const url = `${this.baseUrl}`;
    return this.http.get<WorkspaceResponse[]>(url).pipe(
      map((response) => WorkspaceMapper.toWorkspaces(response)),
      tap((workspaces) => this.listWorkspaces.set(workspaces)),
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
    );
  }

  public getAllWorkspacesByCode(code: string): Observable<Workspace | null> {
    const url = `${this.baseUrl}/${code}`;
    return this.http.get<WorkspaceResponse>(url).pipe(
      map((response) => WorkspaceMapper.toWorkspace(response)),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  public deleteWorkspace(workspaceId: string): Observable<void> {
    const url = `${this.baseUrl}/${workspaceId}`;
    return this.http.delete<void>(url).pipe(
      catchError((error) => {
        this.handleError(error);
        return of(undefined);
      }),
    );
  }

  public removeMember(workspaceCode: string, memberId: number): Observable<void> {
    const url = `${this.baseUrl}/${workspaceCode}/members/${memberId}`;
    return this.http.delete<void>(url).pipe(
      tap(() => {
        this.notification.success('Member removed');
      }),
      catchError((error) => {
        this.handleError(error);
        return of(undefined);
      }),
    );
  }

  public getAWorkspace(id: string): Observable<Workspace | null> {
    const url = `${this.baseUrl}/${id}`;
    return this.http.get<WorkspaceResponse>(url).pipe(
      map((response) => WorkspaceMapper.toWorkspace(response)),
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
