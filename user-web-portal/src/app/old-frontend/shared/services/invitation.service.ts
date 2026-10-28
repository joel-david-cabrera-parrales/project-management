import { inject, Injectable } from '@angular/core';
import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { environment } from '../../../../environments/environment';
import { catchError, map, Observable, of, tap } from 'rxjs';
import { WorkspaceResponse } from '../../workspace/interfaces/workspace-response.interface';
import { WorkspaceMapper } from '../../workspace/mappers/workspace.mapper';
import { Workspace } from '../../workspace/models/workspace.models';
import { NotificationService } from './notification.service';

export interface GetInvitationResponse {
  workspace: WorkspaceResponse;
  invitationCode: string;
}

export interface AcceptInvitationPayload {
  newMemberCode: string;
  workspaceCode: string;
  workspaceInvitationCode: string;
}

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly baseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);
  private readonly notification = inject(NotificationService);

  getInvitation(code: string): Observable<{ workspace: Workspace; invitationCode: string } | null> {
    return this.http.get<GetInvitationResponse>(`${this.baseUrl}/workspace-invitation/${code}`).pipe(
      map((response) => ({
        workspace: WorkspaceMapper.toWorkspace(response.workspace),
        invitationCode: response.invitationCode,
      })),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  acceptInvitation(payload: AcceptInvitationPayload): Observable<any> {
    return this.http.post(`${this.baseUrl}/workspace/add-member`, payload).pipe(
      tap(() => {
        this.notification.success('You have joined the workspace!');
      }),
      catchError((error: HttpErrorResponse) => {
        this.handleError(error);
        return of(null);
      }),
    );
  }

  private handleError(error: HttpErrorResponse) {
    if (error.status === 404) {
      this.notification.error('Invitation not found or has expired');
    } else if (error.status === 400 || error.status === 401) {
      this.notification.error(error.error?.message || 'An error occurred');
    } else {
      this.notification.error('Unexpected error');
    }
  }
}
