import {
  WorkspaceResponse,
  BoardResponse,
  TaskListResponse,
  TaskResponse,
  AssigneeResponse,
  LabelResponse,
  WorkspaceMemberResponse,
  UserRelationResponse,
} from '../interfaces/workspace-response.interface';
import { Workspace, Board, BoardList, Task, Label, Member, Assignment, UserRelation } from '../models/workspace.models';

export class WorkspaceMapper {
  static toWorkspace(response: WorkspaceResponse): Workspace {
    return {
      id: response.code,
      name: response.title,
      description: response.description,
      color: response.color,
      initials: WorkspaceMapper.toInitials(response.title),
      boards: WorkspaceMapper.toBoards(response.boards),
      members: WorkspaceMapper.toMembers(response.workspaceMembers),
      userRelation: response.userRelation ? WorkspaceMapper.toUserRelation(response.userRelation) : undefined,
      createdAt: new Date(response.createdAt),
    };
  }

  static toUserRelation(relation: UserRelationResponse): UserRelation {
    return {
      workspaceMemberId: relation.workspaceMemberId,
      fullname: relation.fullname,
      roleMember: relation.roleMember,
    };
  }

  static toWorkspaces(response: WorkspaceResponse[]): Workspace[] {
    if (!response || response.length === 0) return [];
    return response.map(WorkspaceMapper.toWorkspace);
  }

  static toBoards(boards: BoardResponse[]): Board[] {
    if (!boards || boards.length === 0) return [];
    return boards.map(WorkspaceMapper.toBoard);
  }

  static toBoard(board: BoardResponse): Board {
    return {
      id: board.boardId,
      code: board.code,
      backgroundType: 'gradient',
      background: '#3b82f6',
      lists: WorkspaceMapper.toTaskLists(board.taskList),
      starred: board.starred,
      visibility: 'private',
    };
  }

  static toTaskLists(taskList: TaskListResponse[]): BoardList[] {
    if (!taskList || taskList.length === 0) return [];
    return taskList.map((tl) => WorkspaceMapper.toTaskList(tl));
  }

  static toTaskList(taskList: TaskListResponse): BoardList {
    return {
      id: taskList.id,
      code: taskList.code,
      title: taskList.title,
      position: taskList.position,
      tasks: WorkspaceMapper.toTasks(taskList.tasks),
    };
  }

  static toMembers(workspaceMembers: WorkspaceMemberResponse[]): Member[] {
    if (!workspaceMembers || workspaceMembers.length === 0) return [];
    return workspaceMembers.map(WorkspaceMapper.toMember);
  }

  static toMember(member: WorkspaceMemberResponse): Member {
    return {
      id: member.workspaceMemberId,
      name: member.fullname,
      email: member.email,
      roleMember: member.roleMember,
      photo: member.photo,
      initials: member.initials,
      avatarColor: member.avatarColor,
    };
  }

  static toInitials(name: string): string {
    return name
      .split(' ')
      .map((n) => n[0])
      .join('')
      .toUpperCase();
  }

  static toLabel(response: LabelResponse): Label {
    return { id: response.id, name: response.name, color: response.color };
  }

  static toLabels(response: LabelResponse[]): Label[] {
    if (!response || response.length === 0) return [];
    return response.map(WorkspaceMapper.toLabel);
  }

  static toAssignment(response: AssigneeResponse): Assignment {
    return {
      id: response.id,
      workspaceMemberId: response.workspaceMemberId,
      fullname: response.fullname,
      email: response.email,
      photo: response.photo,
      initials: response.initials,
      avatarColor: response.avatarColor,
    };
  }

  static toAssignees(response: AssigneeResponse[]): Assignment[] {
    if (!response || response.length === 0) return [];
    return response.map(WorkspaceMapper.toAssignment);
  }

  static toTask(response: TaskResponse): Task {
    return {
      id: response.taskId,
      code: response.code,
      title: response.title,
      description: response.description,
      dateInit: response.dateInit,
      dateEnd: response.dateEnd,
      position: response.position,
      isAvailable: response.isAvailable,
      priority: 'medium',
      completed: response.completed,
      checklistTotal: 0,
      checklistDone: 0,
      comments: response.commentsCount ?? 0,
      attachments: response.attachmentsCount ?? 0,
      labels: WorkspaceMapper.toLabels(response.labels),
      assignees: WorkspaceMapper.toAssignees(response.assignees),
    };
  }

  static toTasks(response: TaskResponse[] | null): Task[] {
    if (!response || response.length === 0) return [];
    return response.map(WorkspaceMapper.toTask);
  }
}
