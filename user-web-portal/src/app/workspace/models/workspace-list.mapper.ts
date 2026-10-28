import { WorkspaceListApiResponse, WorkspaceListItem } from './workspace-list.models';

export class WorkspaceListMapper {
  static toWorkspaceListItem(response: WorkspaceListApiResponse): WorkspaceListItem {
    const name = response.title?.trim() ?? '';

    return {
      code: response.code,
      name,
      initials: name
        .split(/\s+/)
        .filter(Boolean)
        .slice(0, 2)
        .map((part) => part.charAt(0).toUpperCase())
        .join(''),
      description: response.description ?? '',
      color: response.color || '#2563eb',
      status: response.status,
      boardCount: response.boards?.length ?? 0,
      memberCount: response.workspaceMembers?.length ?? 0,
      createdAt: new Date(response.createdAt),
    };
  }

  static toWorkspaceListItems(responses: WorkspaceListApiResponse[]): WorkspaceListItem[] {
    return responses.map((response) => this.toWorkspaceListItem(response));
  }
}
