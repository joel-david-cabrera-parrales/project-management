import { WorkspaceDetail, WorkspaceDetailApiResponse } from './workspace-detail.models';

export class WorkspaceDetailMapper {
  static toWorkspaceDetail(response: WorkspaceDetailApiResponse): WorkspaceDetail {
    return {
      id: response.id,
      code: response.code,
      name: response.title,
      description: response.description ?? '',
      color: response.color || '#2563eb',
      status: response.status,
      createdAt: new Date(response.createdAt),
      members: response.workspaceMembers ?? [],
      workspaceMemberId: response.userRelation?.workspaceMemberId ?? null,
      roleMember: response.userRelation?.roleMember ?? null,
      boards: response.boards ?? [],
    };
  }
}
