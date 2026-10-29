import { Workspace } from '../entities/workspace.entity';
import {
  IBoard,
  ITask,
  IWorkspace,
  IWorkspaceMember,
  IUserWorkspaceRelation,
  TaskListResponse,
  WorkspaceRole,
} from '../interfaces/workspace-response.interface';
import { Board } from '../entities/board.entity';
import { WorkspaceMember } from '../entities/workspace-member.entity';
import { TaskList } from '../../task-list/entities/task-list.entity';
import { Task } from 'src/task/entities/task.entity';
import { toPhotoUrl } from '../../common/helpers/photo-url.helper';

export class WorkspaceMapper {
  private static readonly AVATAR_COLORS = [
    '#ef4444',
    '#6366f1',
    '#3b82f6',
    '#10b981',
    '#f59e0b',
    '#ec4899',
    '#8b5cf6',
    '#14b8a6',
  ];

  static toWorkspacesResponse(workspace: Workspace[], userId?: number): IWorkspace[] {
    return workspace.map((ws: Workspace) => WorkspaceMapper.toWorkspaceReponse(ws, userId));
  }

  private static toInitials(firstName: string, firstSurname: string): string {
    return `${firstName.charAt(0)}${firstSurname.charAt(0)}`.toUpperCase();
  }

  private static toAvatarColor(fullName: string): string {
    const index =
      fullName.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % WorkspaceMapper.AVATAR_COLORS.length;
    return WorkspaceMapper.AVATAR_COLORS[index];
  }

  static toWorkspaceReponse(workspace: Workspace, userId?: number): IWorkspace {
    const workspaceMembers: IWorkspaceMember[] = WorkspaceMapper.toWorkspaceMembersResponse(workspace.workspaceMembers);

    const boards: IBoard[] = WorkspaceMapper.toBoardsResponse(workspace.boards);

    let userRelation: IUserWorkspaceRelation | undefined;
    if (userId !== undefined) {
      const myMembership = workspace.workspaceMembers.find((m) => m.user?.id === userId);
      if (myMembership) {
        const profile = myMembership.user?.profile;
        userRelation = {
          workspaceMemberId: myMembership.id,
          fullname: `${profile?.firstName ?? ''} ${profile?.firstSurname ?? ''}`.trim(),
          roleMember: myMembership.roleMember as WorkspaceRole,
        };
      }
    }

    const workspaceResponse: IWorkspace = {
      id: workspace.id,
      code: workspace.code,
      slugCode: workspace.slugCode,
      title: workspace.title,
      description: workspace.description,
      color: workspace.color,
      status: workspace.status,
      isAvailable: workspace.isAvailable,
      createdAt: workspace.createdAt,
      updatedAt: workspace.updatedAt,
      workspaceMembers,
      userRelation,
      boards,
    };

    return workspaceResponse;
  }

  static toBoardsResponse(boards: Board[]): IBoard[] {
    return boards.map((board: Board) => WorkspaceMapper.toBoardResponse(board));
  }

  static toBoardResponse(board: Board): IBoard {
    // Mapeamos los tasklist
    const taskList: TaskListResponse[] = board.taskList
      .filter((taskList) => taskList.isAvailable)
      .map(WorkspaceMapper.toTaskListResponse);

    return {
      boardId: board.id,
      code: board.code,
      title: board.title ?? null,
      starred: board.starred,
      taskList,
    };
  }

  static toWorkspaceMembersResponse(members: WorkspaceMember[]): IWorkspaceMember[] {
    return members.map((member) => WorkspaceMapper.toWorkspaceMemberResponse(member));
  }

  static toWorkspaceMemberResponse(member: WorkspaceMember): IWorkspaceMember {
    const { firstName, firstSurname, email, photo, code } = member.user.profile;
    const fullname = `${firstName} ${firstSurname}`;
    return {
      workspaceMemberId: member.id,
      fullname,
      roleMember: member.roleMember as WorkspaceRole,
      email,
      photo: toPhotoUrl(photo, code),
      initials: WorkspaceMapper.toInitials(firstName, firstSurname),
      avatarColor: WorkspaceMapper.toAvatarColor(fullname),
    };
  }

  static toTaskListsResponse(taskLists: TaskList[]): TaskListResponse[] {
    return taskLists.map(WorkspaceMapper.toTaskListResponse);
  }

  static toTaskListResponse(taskList: TaskList): TaskListResponse {
    // Mapeamos los tasks asociados a los tasklist y a los boards
    const tasks: ITask[] = taskList.tasks.filter((task) => task.isAvailable).map(WorkspaceMapper.toTaskResponse);

    return {
      id: taskList.id,
      code: taskList.code,
      title: taskList.title,
      position: taskList.position,
      isAvailable: taskList.isAvailable,
      tasks,
    };
  }

  static toTaskResponse(task: Task): ITask {
    const labels = (task.labels ?? []).map((tl) => ({
      id: tl.label.id,
      code: tl.label.code,
      name: tl.label.name,
      color: tl.label.color,
    }));

    const assignees = (task.assignments ?? []).map((assignment) => {
      const profile = assignment.workspaceMember?.user?.profile;
      const firstName = profile?.firstName ?? '';
      const firstSurname = profile?.firstSurname ?? '';
      const email = profile?.email ?? '';
      const fullname = `${firstName} ${firstSurname}`;
      return {
        id: assignment.id,
        workspaceMemberId: assignment.workspaceMember.id,
        fullname,
        email,
        photo: toPhotoUrl(profile?.photo, profile?.code),
        initials: WorkspaceMapper.toInitials(firstName, firstSurname),
        avatarColor: WorkspaceMapper.toAvatarColor(fullname),
      };
    });

    return {
      taskId: task.id,
      code: task.code,
      title: task.title,
      description: task.description,
      dateInit: task.dateInit,
      dateEnd: task.dateEnd,
      completed: task.completed,
      position: task.position,
      isAvailable: task.isAvailable,
      createdAt: task.createdAt,
      updatedAt: task.updatedAt,
      labels,
      assignees,
      attachmentsCount: (task as any).attachmentsCount ?? 0,
      commentsCount: (task as any).commentsCount ?? 0,
    };
  }
}
