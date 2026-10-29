import { HttpClient, HttpParams } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { CreateWorkspaceTaskPayload, ReorderWorkspaceTasksPayload, UpdateWorkspaceTaskPayload, WorkspaceTask } from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceTasksApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/task`;

  createTask(payload: CreateWorkspaceTaskPayload): Observable<WorkspaceTask> {
    return this.http.post<WorkspaceTask>(this.endpoint, payload);
  }

  getTask(taskId: number): Observable<WorkspaceTask> {
    return this.http.get<WorkspaceTask>(`${this.endpoint}/${taskId}`);
  }

  updateTask(taskId: number, workspaceCode: string, payload: UpdateWorkspaceTaskPayload): Observable<WorkspaceTask> {
    return this.http.patch<WorkspaceTask>(`${this.endpoint}/${taskId}`, payload, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

  deleteTask(taskId: number, workspaceCode: string): Observable<void> {
    return this.http.delete<void>(`${this.endpoint}/${taskId}`, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

  addLabel(taskId: number, workspaceCode: string, labelId: number): Observable<WorkspaceTask> {
    return this.http.post<WorkspaceTask>(`${this.endpoint}/${taskId}/labels`, { labelId }, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

  removeLabel(taskId: number, workspaceCode: string, labelId: number): Observable<WorkspaceTask> {
    return this.http.delete<WorkspaceTask>(`${this.endpoint}/${taskId}/labels/${labelId}`, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

  assignMember(taskId: number, workspaceCode: string, workspaceMemberId: number): Observable<WorkspaceTask> {
    return this.http.post<WorkspaceTask>(`${this.endpoint}/${taskId}/assign`, { workspaceMemberId }, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

  unassignMember(taskId: number, workspaceCode: string, assignmentId: number): Observable<WorkspaceTask> {
    return this.http.delete<WorkspaceTask>(`${this.endpoint}/${taskId}/assign/${assignmentId}`, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

  reorderTasks(workspaceCode: string, payload: ReorderWorkspaceTasksPayload): Observable<void> {
    return this.http.patch<void>(`${this.endpoint}/reorder`, payload, {
      params: new HttpParams().set('ws', workspaceCode),
    });
  }

}
