import { HttpClient, HttpEvent } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { WorkspaceTaskAttachment, WorkspaceTaskComment } from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceTaskActivityApiService {
  private readonly http = inject(HttpClient);
  private readonly attachmentsUrl = `${environment.apiUrl}/attachment`;
  private readonly commentsUrl = `${environment.apiUrl}/comment`;

  getAttachments(taskCode: string): Observable<WorkspaceTaskAttachment[]> {
    return this.http.get<WorkspaceTaskAttachment[]>(`${this.attachmentsUrl}/task/${taskCode}`);
  }

  uploadAttachment(taskCode: string, file: File): Observable<HttpEvent<WorkspaceTaskAttachment>> {
    const data = new FormData();
    data.append('file', file);
    return this.http.post<WorkspaceTaskAttachment>(`${this.attachmentsUrl}/upload/${taskCode}`, data, {
      observe: 'events',
      reportProgress: true,
    });
  }

  downloadAttachment(code: string): Observable<Blob> {
    return this.http.get(`${this.attachmentsUrl}/file/${code}`, { responseType: 'blob' });
  }

  deleteAttachment(code: string): Observable<unknown> {
    return this.http.delete(`${this.attachmentsUrl}/${code}`);
  }

  getComments(taskCode: string): Observable<WorkspaceTaskComment[]> {
    return this.http.get<WorkspaceTaskComment[]>(`${this.commentsUrl}/task/${taskCode}`);
  }

  createComment(taskCode: string, content: string, parentId?: number): Observable<WorkspaceTaskComment> {
    return this.http.post<WorkspaceTaskComment>(`${this.commentsUrl}/task/${taskCode}`, { content, parentId });
  }

  deleteComment(code: string): Observable<unknown> {
    return this.http.delete(`${this.commentsUrl}/${code}`);
  }
}
