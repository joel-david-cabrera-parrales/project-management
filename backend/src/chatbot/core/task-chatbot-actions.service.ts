import { BadRequestException, ForbiddenException, Injectable } from '@nestjs/common';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { CommentService } from 'src/comment/comment.service';
import { AssignMemberDto } from 'src/task/dto/assign-member.dto';
import { CreateTaskDto } from 'src/task/dto/create-task.dto';
import { TaskService } from 'src/task/task.service';
import { IBoard, ITask, IWorkspace, TaskListResponse, WorkspaceRole } from 'src/workspace/interfaces/workspace-response.interface';
import { WorkspaceService } from 'src/workspace/workspace.service';
import { ChatbotUserData } from '../interfaces/chatbot-flow.interface';
import { ChatbotActionExecutor } from '../classes/chatbot-action-executor.class';

type ResolvedTask = {
  workspace: IWorkspace;
  board: IBoard;
  list: TaskListResponse;
  task: ITask;
};

@Injectable()
export class TaskChatbotActionsService extends ChatbotActionExecutor {
  constructor(
    private readonly workspaceService: WorkspaceService,
    private readonly taskService: TaskService,
    private readonly commentService: CommentService,
  ) {
    super();
  }

  async execute(action: string, user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    switch (action) {
      case 'list-workspaces': return this.listWorkspaces(user);
      case 'resolve-workspace-for-create': return this.resolveWorkspaceForCreate(user, data);
      case 'resolve-task-list': return this.resolveTaskList(user, data);
      case 'create-task': return this.createTask(user, data);
      case 'list-my-tasks': return this.listMyTasks(user);
      case 'list-open-tasks': return this.listOpenTasks(user);
      case 'list-commentable-tasks': return this.listCommentableTasks(user);
      case 'resolve-task-to-complete': return this.resolveTaskReference(user, data, 'complete');
      case 'resolve-task-for-assignment': return this.resolveTaskReference(user, data, 'assign');
      case 'resolve-task-for-comment': return this.resolveTaskReference(user, data, 'comment');
      case 'resolve-assignee': return this.resolveAssignee(user, data);
      case 'complete-task': return this.completeTask(user, data);
      case 'assign-task': return this.assignTask(user, data);
      case 'add-comment': return this.addComment(user, data);
      default: throw new BadRequestException('Esta acción del asistente no está disponible.');
    }
  }

  private async listWorkspaces(user: AuthenticatedUserDto): Promise<ChatbotUserData> {
    const workspaces = (await this.workspaceService.findAll(user))
      .filter((workspace) => workspace.status === 1 && this.canWrite(workspace.userRelation?.roleMember));
    return {
      workspaceSummary: workspaces.length
        ? workspaces.map((workspace) => `• ${workspace.title} — código ${workspace.code}`).join('\n')
        : 'No encontré workspaces activos a los que tengas acceso.',
    };
  }

  private async resolveWorkspaceForCreate(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const reference = this.readString(data, 'workspaceRef');
    const workspaces = (await this.workspaceService.findAll(user)).filter((workspace) => workspace.status === 1);
    const workspace = this.resolveWorkspaceReference(reference, workspaces);
    this.assertCanWrite(workspace);
    const taskLists = workspace.boards.flatMap((board) => board.taskList.map((list) => ({ board, list })));
    if (!taskLists.length) throw new BadRequestException('Ese workspace todavía no tiene columnas. Pide a un miembro que cree una columna primero.');

    return {
      workspaceCode: workspace.code,
      workspaceTitle: workspace.title,
      taskListSummary: taskLists
        .map(({ board, list }) => `• ${list.id} — ${board.title?.trim() || 'Tablero'} / ${list.title}`)
        .join('\n'),
    };
  }

  private async resolveTaskList(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const workspaceCode = this.readString(data, 'workspaceCode');
    const reference = this.readString(data, 'taskListRef');
    const workspace = await this.workspaceService.findOneWorkspace(workspaceCode, user);
    if (!workspace) throw new BadRequestException('No encontré ese workspace. Inicia una conversación nueva e inténtalo otra vez.');
    if (workspace.status !== 1) throw new ForbiddenException('Ese workspace no está activo.');
    this.assertCanWrite(workspace);

    const lists = workspace.boards.flatMap((board) => board.taskList.map((list) => ({ board, list })));
    const normalized = reference.toLocaleLowerCase();
    const matches = lists.filter(({ board, list }) =>
      String(list.id) === reference
      || list.code.toLocaleLowerCase() === normalized
      || list.title.toLocaleLowerCase() === normalized
      || `${board.title ?? ''}/${list.title}`.toLocaleLowerCase() === normalized,
    );
    if (!matches.length) throw new BadRequestException('No encontré esa columna. Usa el ID que aparece junto a la columna e inténtalo de nuevo.');
    if (matches.length > 1) throw new BadRequestException('Hay varias columnas con ese nombre. Usa el ID único que aparece en la lista.');

    const { board, list } = matches[0];
    return {
      boardCode: board.code,
      boardTitle: board.title?.trim() || 'Tablero',
      taskListId: list.id,
      taskListTitle: list.title,
    };
  }

  private async createTask(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const workspaceCode = this.readString(data, 'workspaceCode');
    const workspace = await this.workspaceService.findOneWorkspace(workspaceCode, user);
    if (!workspace) throw new BadRequestException('No encontré el workspace seleccionado.');
    if (workspace.status !== 1) throw new ForbiddenException('Ese workspace no está activo.');
    this.assertCanWrite(workspace);

    const title = this.readString(data, 'taskTitle').trim();
    if (title.length < 5 || title.length > 250) {
      throw new BadRequestException('El título debe tener entre 5 y 250 caracteres.');
    }
    const descriptionInput = this.readOptionalString(data, 'taskDescription');
    const description = /^(omitir|no|ninguna|sin descripción)$/i.test(descriptionInput) ? '' : descriptionInput;
    if (description && (description.length < 5 || description.length > 25000)) {
      throw new BadRequestException('La descripción debe tener entre 5 y 25.000 caracteres.');
    }
    if (title.length < 5 || title.length > 250) {
      throw new BadRequestException('El título debe tener entre 5 y 250 caracteres.');
    }
    if (description && (description.length < 5 || description.length > 25000)) {
      throw new BadRequestException('La descripción debe tener entre 5 y 25.000 caracteres.');
    }
    const dto: CreateTaskDto = {
      title,
      description,
      position: 1,
      taskListId: this.readNumber(data, 'taskListId'),
      workspaceCode,
      boardCode: this.readString(data, 'boardCode'),
    };
    const task = await this.taskService.create(dto);
    return { createdTaskTitle: task.title, createdTaskCode: task.code };
  }

  private async listMyTasks(user: AuthenticatedUserDto): Promise<ChatbotUserData> {
    const workspaces = await this.workspaceService.findAll(user);
    const tasks = workspaces.flatMap((workspace) => workspace.boards.flatMap((board) =>
      board.taskList.flatMap((list) => list.tasks
        .filter((task) => task.isAvailable && !task.completed
          && task.assignees?.some((assignee) => assignee.workspaceMemberId === workspace.userRelation?.workspaceMemberId))
        .map((task) => ({ workspace, board, list, task }))),
    )).slice(0, 20);

    return {
      taskSummary: tasks.length
        ? tasks.map(({ workspace, board, list, task }) => this.formatTask(workspace, board, list, task)).join('\n')
        : '¡Qué bien! No tienes tareas abiertas asignadas ahora mismo. 🌟',
    };
  }

  private async listOpenTasks(user: AuthenticatedUserDto): Promise<ChatbotUserData> {
    const workspaces = await this.workspaceService.findAll(user);
    const tasks = workspaces
      .filter((workspace) => workspace.status === 1 && this.canWrite(workspace.userRelation?.roleMember))
      .flatMap((workspace) => workspace.boards.flatMap((board) =>
        board.taskList.flatMap((list) => list.tasks
          .filter((task) => task.isAvailable && !task.completed)
          .map((task) => ({ workspace, board, list, task }))),
      )).slice(0, 20);

    return {
      taskSummary: tasks.length
        ? tasks.map(({ workspace, board, list, task }) => this.formatTask(workspace, board, list, task)).join('\n')
        : 'No hay tareas abiertas en tus workspaces activos. ✅',
    };
  }

  private async listCommentableTasks(user: AuthenticatedUserDto): Promise<ChatbotUserData> {
    const workspaces = await this.workspaceService.findAll(user);
    const tasks = workspaces
      .filter((workspace) => workspace.status === 1 && this.canWrite(workspace.userRelation?.roleMember))
      .flatMap((workspace) => workspace.boards.flatMap((board) =>
        board.taskList.flatMap((list) => list.tasks
          .filter((task) => task.isAvailable)
          .map((task) => ({ workspace, board, list, task }))),
      )).slice(0, 20);

    return {
      taskSummary: tasks.length
        ? tasks.map(({ workspace, board, list, task }) => this.formatTask(workspace, board, list, task)).join('\n')
        : 'No encontré tareas en tus workspaces activos.',
    };
  }

  private async resolveTaskReference(
    user: AuthenticatedUserDto,
    data: ChatbotUserData,
    purpose: 'complete' | 'assign' | 'comment',
  ): Promise<ChatbotUserData> {
    const reference = this.readString(data, 'taskRef').toLocaleLowerCase();
    const workspaces = await this.workspaceService.findAll(user);
    const matches: ResolvedTask[] = [];

    for (const workspace of workspaces) {
      if (workspace.status !== 1 || !this.canWrite(workspace.userRelation?.roleMember)) continue;
      for (const board of workspace.boards) {
        for (const list of board.taskList) {
          for (const task of list.tasks) {
            const referenceMatches = task.code.toLocaleLowerCase() === reference || String(task.taskId) === reference;
            if (!referenceMatches || !task.isAvailable || (purpose === 'complete' && task.completed)) continue;
            matches.push({ workspace, board, list, task });
          }
        }
      }
    }

    if (!matches.length) {
      throw new BadRequestException(purpose === 'complete'
        ? 'No encontré una tarea abierta con ese código o ID en tus workspaces activos.'
        : 'No encontré una tarea con ese código o ID en tus workspaces activos.');
    }
    if (matches.length > 1) throw new BadRequestException('Encontré más de una tarea. Copia el código completo de la tarea e inténtalo de nuevo.');

    const { workspace, task } = matches[0];
    return {
      targetWorkspaceCode: workspace.code,
      targetTaskId: task.taskId,
      targetTaskCode: task.code,
      targetTaskTitle: task.title,
      ...(purpose === 'assign' ? { targetAssignedMemberIds: task.assignees?.map((assignee) => assignee.workspaceMemberId) ?? [] } : {}),
      ...(purpose === 'assign' ? {
        memberSummary: workspace.workspaceMembers
          .map((member) => `• ${member.workspaceMemberId} — ${member.fullname} (${member.email})`)
          .join('\n') || 'Este workspace todavía no tiene miembros disponibles.',
      } : {}),
    };
  }

  private async resolveAssignee(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const workspaceCode = this.readString(data, 'targetWorkspaceCode');
    const workspace = await this.workspaceService.findOneWorkspace(workspaceCode, user);
    if (!workspace) throw new BadRequestException('No encontré el workspace de esa tarea.');
    if (workspace.status !== 1) throw new ForbiddenException('Ese workspace no está activo.');
    this.assertCanWrite(workspace);

    const reference = this.readString(data, 'assigneeRef').toLocaleLowerCase();
    const matches = workspace.workspaceMembers.filter((member) =>
      String(member.workspaceMemberId) === reference
      || member.email.toLocaleLowerCase() === reference
      || member.fullname.toLocaleLowerCase() === reference,
    );
    if (!matches.length) throw new BadRequestException('No encontré a ese miembro. Usa su ID, correo o nombre completo.');
    if (matches.length > 1) throw new BadRequestException('Hay varios miembros con ese nombre. Usa su ID o correo.');
    const assignedMemberIds = Array.isArray(data.targetAssignedMemberIds) ? data.targetAssignedMemberIds : [];
    if (assignedMemberIds.includes(matches[0].workspaceMemberId)) {
      throw new BadRequestException('Ese miembro ya está asignado a esta tarea.');
    }

    return { assigneeId: matches[0].workspaceMemberId, assigneeName: matches[0].fullname };
  }

  private async completeTask(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const workspaceCode = this.readString(data, 'targetWorkspaceCode');
    const workspace = await this.workspaceService.findOneWorkspace(workspaceCode, user);
    if (!workspace || workspace.status !== 1) throw new ForbiddenException('No tienes acceso a un workspace activo con esa tarea.');
    this.assertCanWrite(workspace);
    await this.taskService.update(
      this.readNumber(data, 'targetTaskId'),
      { completed: true },
      user,
      workspaceCode,
    );
    return {};
  }

  private async assignTask(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const workspaceCode = this.readString(data, 'targetWorkspaceCode');
    const workspace = await this.workspaceService.findOneWorkspace(workspaceCode, user);
    if (!workspace || workspace.status !== 1) throw new ForbiddenException('No tienes acceso a un workspace activo con esa tarea.');
    this.assertCanWrite(workspace);
    const dto: AssignMemberDto = { workspaceMemberId: this.readNumber(data, 'assigneeId') };
    await this.taskService.assignMember(this.readNumber(data, 'targetTaskId'), dto, user.id, workspaceCode);
    return {};
  }

  private async addComment(user: AuthenticatedUserDto, data: ChatbotUserData): Promise<ChatbotUserData> {
    const workspaceCode = this.readString(data, 'targetWorkspaceCode');
    const workspace = await this.workspaceService.findOneWorkspace(workspaceCode, user);
    if (!workspace || workspace.status !== 1) throw new ForbiddenException('No tienes acceso a un workspace activo con esa tarea.');
    this.assertCanWrite(workspace);
    await this.commentService.create(
      this.readString(data, 'commentText'),
      this.readString(data, 'targetTaskCode'),
      user.id,
    );
    return {};
  }

  private resolveWorkspaceReference(reference: string, workspaces: IWorkspace[]): IWorkspace {
    const normalized = reference.toLocaleLowerCase();
    const matches = workspaces.filter((workspace) =>
      workspace.code.toLocaleLowerCase() === normalized
      || workspace.slugCode.toLocaleLowerCase() === normalized
      || workspace.title.toLocaleLowerCase() === normalized,
    );
    if (!matches.length) throw new BadRequestException('No encontré ese workspace activo. Prueba con el código que aparece arriba.');
    if (matches.length > 1) throw new BadRequestException('Hay varios workspaces con ese nombre. Usa el código único.');
    return matches[0];
  }

  private assertCanWrite(workspace: IWorkspace): void {
    if (!this.canWrite(workspace.userRelation?.roleMember)) {
      throw new ForbiddenException('Para hacer ese cambio necesitas ser owner o member del workspace.');
    }
  }

  private canWrite(role?: WorkspaceRole): boolean {
    return role === 'owner' || role === 'member';
  }

  private formatTask(workspace: IWorkspace, board: IBoard, list: TaskListResponse, task: ITask): string {
    const status = task.completed ? '✅ Completada' : '🟡 Pendiente';
    const dueDate = task.dateEnd ? ` — vence ${new Date(task.dateEnd).toLocaleDateString('es-ES')}` : '';
    return `• ${task.code} — ${task.title} (${status}) · ${workspace.title} / ${board.title || 'Tablero'} / ${list.title}${dueDate}`;
  }

  private readString(data: ChatbotUserData, key: string): string {
    const value = data[key];
    if (typeof value !== 'string' || !value.trim()) throw new BadRequestException('Necesito ese dato para continuar.');
    return value.trim();
  }

  private readNumber(data: ChatbotUserData, key: string): number {
    const value = data[key];
    const parsed = typeof value === 'number' ? value : Number(value);
    if (!Number.isInteger(parsed) || parsed < 1) throw new BadRequestException('No pude validar la referencia seleccionada.');
    return parsed;
  }

  private readOptionalString(data: ChatbotUserData, key: string): string {
    const value = data[key];
    return typeof value === 'string' ? value.trim() : '';
  }
}
