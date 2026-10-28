import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { TaskComment } from '../models/workspace.models';
import { Observable, map, catchError, of } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';

export interface CreateCommentDto {
  content: string;
  parentId?: number;
  mentions?: number[];
}

interface CommentRaw {
  id: number;
  code: string;
  content: string;
  author: {
    id: number;
    fullname: string;
    email: string;
    photo: string | null;
    initials: string;
    avatarColor: string;
  };
  parentId: number | null;
  mentions: number[];
  createdAt: string;
  replies?: CommentRaw[];
}

@Injectable({
  providedIn: 'root',
})
export class CommentService {
  private readonly baseUrl = environment.apiUrl + '/comment';
  private http = inject(HttpClient);
  private notification = inject(NotificationService);

  private toComment(raw: CommentRaw): TaskComment {
    return {
      id: raw.id,
      code: raw.code,
      content: raw.content,
      parentId: raw.parentId,
      mentions: raw.mentions,
      createdAt: raw.createdAt,
      author: {
        id: raw.author.id,
        workspaceMemberId: raw.author.id,
        fullname: raw.author.fullname,
        email: raw.author.email,
        photo: raw.author.photo,
        initials: raw.author.initials,
        avatarColor: raw.author.avatarColor,
      },
      replies: raw.replies?.map((r) => this.toComment(r)),
    };
  }

  getTaskComments(taskCode: string): Observable<TaskComment[]> {
    return this.http.get<CommentRaw[]>(`${this.baseUrl}/task/${taskCode}`).pipe(
      map((raws) => raws.map((r) => this.toComment(r))),
      catchError((error) => {
        this.handleError(error);
        return of([]);
      }),
    );
  }

  createComment(taskCode: string, content: string, parentId?: number, mentions?: number[]): Observable<TaskComment | null> {
    const dto: CreateCommentDto = { content, parentId, mentions };
    return this.http.post<CommentRaw>(`${this.baseUrl}/task/${taskCode}`, dto).pipe(
      map((raw) => this.toComment(raw)),
      catchError((error) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteComment(code: string): Observable<boolean> {
    return this.http.delete(`${this.baseUrl}/${code}`).pipe(
      map(() => true),
      catchError((error) => {
        this.handleError(error);
        return of(false);
      }),
    );
  }

  private handleError(error: HttpErrorResponse) {
    switch (error.status) {
      case 400:
      case 401:
        this.notification.error(error.error?.message);
        break;
      case 403:
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
