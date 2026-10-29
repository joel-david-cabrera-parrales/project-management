import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { map, Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceDetailMapper } from '../models/workspace-detail.mapper';
import {
  CreateTaskListPayload,
  WorkspaceDetail,
  WorkspaceDetailApiResponse,
  WorkspaceDetailTaskList,
} from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceDetailApiService {
  private readonly http = inject(HttpClient);
  private readonly endpoint = `${environment.apiUrl}/workspace`;
  private readonly taskListEndpoint = `${environment.apiUrl}/task-list`;

  getWorkspace(code: string): Observable<WorkspaceDetail> {
    return this.http
      .get<WorkspaceDetailApiResponse>(`${this.endpoint}/${code}`)
      .pipe(map(WorkspaceDetailMapper.toWorkspaceDetail));
  }

  updateBoardTitle(workspaceCode: string, boardCode: string, title: string): Observable<{ boardId: number; code: string; title: string; starred: boolean }> {
    return this.http.patch<{ boardId: number; code: string; title: string; starred: boolean }>(
      `${this.endpoint}/${workspaceCode}/boards/${boardCode}`,
      { title },
    );
  }

  updateTaskListTitle(listId: number, title: string): Observable<WorkspaceDetailTaskList> {
    return this.http.patch<WorkspaceDetailTaskList>(`${this.taskListEndpoint}/${listId}`, { title });
  }

  createTaskList(payload: CreateTaskListPayload): Observable<WorkspaceDetailTaskList> {
    return this.http.post<WorkspaceDetailTaskList>(this.taskListEndpoint, payload);
  }

  deleteTaskList(listId: number): Observable<void> {
    return this.http.delete<void>(`${this.taskListEndpoint}/${listId}`);
  }
}
