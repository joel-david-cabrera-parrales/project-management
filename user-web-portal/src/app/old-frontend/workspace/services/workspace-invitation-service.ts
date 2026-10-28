import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, Observable, of, tap } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';
import { InvitationItem } from '../models/workspace.models';

export interface SendInvitationPayload {
  workspaceCode: string;
  invitedEmail: string;
  inviterEmail: string;
  rolMember: 'member' | 'viewer';
}

export interface SendInvitationResponse {
  inviteLink: string;
}

@Injectable({ providedIn: 'root' })
export class WorkspaceInvitationService {
  private readonly baseUrl = environment.apiUrl + '/workspace-invitation';
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);

  sendInvitation(payload: SendInvitationPayload): Observable<SendInvitationResponse | null> {
    return this.http.post<SendInvitationResponse>(`${this.baseUrl}/send-invitation`, payload).pipe(
      tap(() => {
        this.notification.success('Invitation sent successfully');
      }),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  getWorkspaceInvitations(workspaceCode: string): Observable<InvitationItem[] | null> {
    return this.http.get<InvitationItem[]>(`${this.baseUrl}/workspace/${workspaceCode}`).pipe(
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  resendInvitation(payload: SendInvitationPayload): Observable<SendInvitationResponse | null> {
    return this.http.post<SendInvitationResponse>(`${this.baseUrl}/resend`, payload).pipe(
      tap(() => {
        this.notification.success('Invitation resent successfully');
      }),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  deleteInvitation(code: string): Observable<void | null> {
    return this.http.delete<void>(`${this.baseUrl}/${code}`).pipe(
      tap(() => {
        this.notification.success('Invitation deleted');
      }),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  private handleError(error: HttpErrorResponse) {
    switch (error.status) {
      case 400:
      case 401:
      case 404:
        this.notification.error(error.error?.message || 'An error occurred');
        break;
      default:
        this.notification.error('Unexpected error');
        break;
    }
  }
}
