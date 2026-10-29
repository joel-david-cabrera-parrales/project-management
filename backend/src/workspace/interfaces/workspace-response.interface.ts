// 1. Definimos los roles como un tipo literal para evitar errores de dedo
export type WorkspaceRole = 'owner' | 'member' | 'viewer';

/*
 * Role-based access control matrix:
 *
 * Endpoint                          | owner | member | viewer
 * ----------------------------------|-------|--------|--------
 * POST   /workspace                 |  ✅   |  ✅    |  ✅   (no guard)
 * GET    /workspace                 |  ✅   |  ✅    |  ✅   (no guard)
 * GET    /workspace/:term           |  ✅   |  ✅    |  ✅   (no guard)
 * PATCH  /workspace/:code           |  ✅   |  ❌    |  ❌
 * DELETE /workspace/:code           |  ✅   |  ❌    |  ❌
 * DELETE /workspace/:code/members/:id| ✅   |  ❌    |  ❌
 * POST   /workspace/add-member      |  ✅   |  ❌    |  ❌
 * PATCH  /workspace/:code/boards/:bc/star | ✅ | ✅   |  ❌
 * -----------------------------------------------------------------
 * POST   /task                      |  ✅   |  ✅    |  ❌
 * PATCH  /task/reorder              |  ✅   |  ✅    |  ❌
 * GET    /task/:id                  |  ✅   |  ✅    |  ✅   (no guard)
 * PATCH  /task/:id                  |  ✅   |  ✅    |  ❌
 * DELETE /task/:id                  |  ✅   |  ❌    |  ❌
 * POST   /task/:id/labels           |  ✅   |  ✅    |  ❌
 * DELETE /task/:id/labels/:labelId  |  ✅   |  ❌    |  ❌
 * POST   /task/:id/assign           |  ✅   |  ✅    |  ❌
 * DELETE /task/:id/assign/:aid      |  ✅   |  ❌    |  ❌
 * -----------------------------------------------------------------
 * POST   /label                     |  ✅   |  ✅    |  ❌
 * GET    /label/workspace/:code     |  ✅   |  ✅    |  ✅   (no guard)
 * PATCH  /label/:id                 |  ✅   |  ✅    |  ❌
 * DELETE /label/:id                 |  ✅   |  ❌    |  ❌
 *
 * Frontend: all write actions (buttons, forms, inputs) are hidden
 * when workspace()?.userRelation?.roleMember === 'viewer'.
 * See workspace-role.guard.ts for the guard implementation.
 */

// 2. Interfaz para un miembro del workspace (Se usa en la lista de miembros)
export interface IWorkspaceMember {
  workspaceMemberId: number;
  fullname: string;
  roleMember: WorkspaceRole;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

// 3. Interfaz para la relación específica del usuario autenticado
export interface IUserWorkspaceRelation {
  workspaceMemberId: number;
  fullname: string;
  roleMember: WorkspaceRole;
}

export interface ILabel {
  id: number;
  code: string;
  name: string;
  color: string;
}

export interface IAssignment {
  id: number;
  workspaceMemberId: number;
  fullname: string;
  email: string;
  photo: string | null;
  initials: string;
  avatarColor: string;
}

export interface ITask {
  taskId: number;
  code: string;
  title: string;
  description: string;
  dateInit?: Date;
  dateEnd?: Date;
  completed: boolean;
  position: number;
  isAvailable: boolean;
  createdAt?: Date;
  updatedAt?: Date;
  labels?: ILabel[];
  assignees?: IAssignment[];
  attachmentsCount?: number;
  commentsCount?: number;
}

export interface TaskListResponse {
  id: number;
  code: string;
  title: string;
  position: number;
  isAvailable: boolean;
  tasks: ITask[];
}

export interface IBoard {
  boardId: number;
  code: string;
  title?: string | null;
  starred: boolean;
  taskList: TaskListResponse[];
}

// 4. Interfaz principal del Workspace
export interface IWorkspace {
  id: number;
  code: string;
  slugCode: string;
  title: string;
  description: string;
  color?: string;
  status: number;
  isAvailable: boolean;
  createdAt: Date;
  updatedAt?: Date;
  workspaceMembers: IWorkspaceMember[];
  userRelation?: IUserWorkspaceRelation;
  boards: IBoard[];
}
