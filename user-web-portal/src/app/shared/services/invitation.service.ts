import { inject, Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { catchError, map, Observable, of } from 'rxjs';

export interface InviteWorkspaceMember {
  fullname: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface InviteWorkspace {
  code: string;
  name: string;
  description: string;
  color: string;
  members: InviteWorkspaceMember[];
}

export interface InviteDetails {
  workspace: InviteWorkspace;
  invitationCode: string;
}

export interface AcceptInvitationPayload {
  newMemberCode: string;
  workspaceCode: string;
  workspaceInvitationCode: string;
}

interface WorkspaceInvitationResponse {
  invitationCode: string;
  workspace: {
    code: string;
    title: string;
    description: string;
    color: string;
    workspaceMembers: {
      fullname: string;
      photo: string | null;
      initials: string;
      avatarColor: string;
    }[];
  };
}

@Injectable({ providedIn: 'root' })
export class InvitationService {
  private readonly baseUrl = environment.apiUrl;
  private readonly http = inject(HttpClient);

  getInvitation(code: string): Observable<InviteDetails | null> {
    return this.http.get<WorkspaceInvitationResponse>(`${this.baseUrl}/workspace-invitation/${code}`).pipe(
      map((response) => ({
        invitationCode: response.invitationCode,
        workspace: {
          code: response.workspace.code,
          name: response.workspace.title,
          description: response.workspace.description,
          color: response.workspace.color,
          members: (response.workspace.workspaceMembers ?? []).map((member) => ({
            fullname: member.fullname,
            photo: member.photo,
            initials: member.initials,
            avatarColor: member.avatarColor,
          })),
        },
      })),
      catchError(() => of(null)),
    );
  }

  acceptInvitation(payload: AcceptInvitationPayload): Observable<unknown | null> {
    return this.http.post(`${this.baseUrl}/workspace/add-member`, payload).pipe(
      catchError(() => of(null)),
    );
  }
}
