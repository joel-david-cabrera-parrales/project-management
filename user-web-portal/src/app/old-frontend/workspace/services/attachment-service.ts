import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpEventType, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TaskAttachment } from '../models/workspace.models';
import { Observable, map, catchError, of, share } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';

@Injectable({
  providedIn: 'root',
})
export class AttachmentService {
  private readonly baseUrl = environment.apiUrl + '/attachment';
  private http = inject(HttpClient);
  private notification = inject(NotificationService);

  getTaskAttachments(taskCode: string): Observable<TaskAttachment[]> {
    return this.http.get<TaskAttachment[]>(`${this.baseUrl}/task/${taskCode}`).pipe(
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
    );
  }

  uploadAttachment(taskCode: string, file: File): { progress: Observable<number>; result: Observable<TaskAttachment | null> } {
    const formData = new FormData();
    formData.append('file', file);

    const req = this.http.post<TaskAttachment>(`${this.baseUrl}/upload/${taskCode}`, formData, {
      reportProgress: true,
      observe: 'events',
    }).pipe(share());

    const progress = req.pipe(
      map((event) => {
        if (event.type === HttpEventType.UploadProgress && event.total) {
          return Math.round((event.loaded / event.total) * 100);
        }
        return 0;
      }),
    );

    const result = req.pipe(
      map((event) => {
        if (event.type === HttpEventType.Response) {
          return event.body as TaskAttachment;
        }
        return null;
      }),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );

    return { progress, result };
  }

  deleteAttachment(code: string): Observable<boolean> {
    return this.http.delete(`${this.baseUrl}/${code}`).pipe(
      map(() => true),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  getFileUrl(code: string): string {
    return `${this.baseUrl}/file/${code}`;
  }

  private handleError(error: HttpErrorResponse) {
    switch (error.status) {
      case 400:
      case 401:
        this.notification.error(error.error?.message);
        break;
      case 404:
        this.notification.error(error.error?.message);
        break;
      default:
        this.notification.error('Error inesperado');
        break;
    }
  }
}
