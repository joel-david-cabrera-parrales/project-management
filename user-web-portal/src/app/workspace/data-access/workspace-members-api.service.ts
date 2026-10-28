import { HttpClient } from '@angular/common/http';
import { inject, Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { SendWorkspaceInvitation, SendWorkspaceInvitationResponse, WorkspaceInvitation } from '../models/workspace-detail.models';

@Injectable({ providedIn: 'root' })
export class WorkspaceMembersApiService {
  private readonly http = inject(HttpClient);
  private readonly workspaceEndpoint = `${environment.apiUrl}/workspace`;
  private readonly invitationEndpoint = `${environment.apiUrl}/workspace-invitation`;

  getInvitations(workspaceCode: string): Observable<WorkspaceInvitation[]> {
    return this.http.get<WorkspaceInvitation[]>(`${this.invitationEndpoint}/workspace/${workspaceCode}`);
  }

  sendInvitation(payload: SendWorkspaceInvitation): Observable<SendWorkspaceInvitationResponse> {
    return this.http.post<SendWorkspaceInvitationResponse>(`${this.invitationEndpoint}/send-invitation`, payload);
  }

  resendInvitation(payload: SendWorkspaceInvitation): Observable<SendWorkspaceInvitationResponse> {
    return this.http.post<SendWorkspaceInvitationResponse>(`${this.invitationEndpoint}/resend`, payload);
  }

  invalidateInvitation(invitationCode: string): Observable<void> {
    return this.http.delete<void>(`${this.invitationEndpoint}/${invitationCode}`);
  }

  removeMember(workspaceCode: string, workspaceMemberId: number): Observable<void> {
    return this.http.delete<void>(`${this.workspaceEndpoint}/${workspaceCode}/members/${workspaceMemberId}`);
  }

  updateMemberRole(workspaceCode: string, workspaceMemberId: number, roleMember: 'member' | 'viewer'):
    Observable<{ workspaceMemberId: number; roleMember: 'member' | 'viewer' }> {
    return this.http.patch<{ workspaceMemberId: number; roleMember: 'member' | 'viewer' }>(
      `${this.workspaceEndpoint}/${workspaceCode}/members/${workspaceMemberId}/role`,
      { roleMember },
    );
  }
}
