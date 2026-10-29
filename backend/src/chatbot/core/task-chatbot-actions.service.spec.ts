jest.mock('src/workspace/workspace.service', () => ({ WorkspaceService: class WorkspaceService {} }));
jest.mock('src/task/task.service', () => ({ TaskService: class TaskService {} }));
jest.mock('src/comment/comment.service', () => ({ CommentService: class CommentService {} }));

import { ForbiddenException } from '@nestjs/common';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { ChatbotUserData } from '../interfaces/chatbot-flow.interface';
import { TaskChatbotActionsService } from './task-chatbot-actions.service';

describe('TaskChatbotActionsService', () => {
  const user = AuthenticatedUserDto.fromUserProfile(15, 'user-code');
  const task = {
    taskId: 30,
    code: 'task-code',
    title: 'Write release notes',
    completed: false,
    isAvailable: true,
    assignees: [{ workspaceMemberId: 15, fullname: 'Test User' }],
    dateEnd: '2026-11-10',
  };
  const workspace = {
    id: 3,
    code: 'workspace-code',
    slugCode: 'team-workspace',
    title: 'Team Workspace',
    status: 1,
    userRelation: { workspaceMemberId: 15, roleMember: 'owner' },
    workspaceMembers: [
      { workspaceMemberId: 15, fullname: 'Test User', email: 'test@example.com' },
      { workspaceMemberId: 19, fullname: 'Other Member', email: 'other@example.com' },
    ],
    boards: [{
      boardId: 5,
      code: 'board-code',
      title: 'Engineering',
      taskList: [{ id: 8, code: 'list-code', title: 'To do', tasks: [task] }],
    }],
  };

  let actions: TaskChatbotActionsService;
  let workspaceService: { findAll: jest.Mock; findOneWorkspace: jest.Mock };
  let taskService: { create: jest.Mock; update: jest.Mock; assignMember: jest.Mock };
  let commentService: { create: jest.Mock };

  beforeEach(() => {
    workspaceService = {
      findAll: jest.fn().mockResolvedValue([workspace]),
      findOneWorkspace: jest.fn().mockResolvedValue(workspace),
    };
    taskService = {
      create: jest.fn().mockResolvedValue({ taskId: 31, code: 'created-task', title: 'New task' }),
      update: jest.fn().mockResolvedValue(undefined),
      assignMember: jest.fn().mockResolvedValue(undefined),
    };
    commentService = { create: jest.fn().mockResolvedValue(undefined) };
    actions = new TaskChatbotActionsService(workspaceService as any, taskService as any, commentService as any);
  });

  it('returns a structured list of the current user assigned open tasks', async () => {
    const result = await actions.execute('list-my-tasks', user, {});
    const cards = result.taskCards as Array<{ taskCode: string; title: string }>;

    expect(cards).toEqual([expect.objectContaining({ taskCode: 'task-code', title: 'Write release notes' })]);
    expect(result.taskSummary).toBe('');
  });

  it('rejects write workflows for viewers', async () => {
    workspaceService.findAll.mockResolvedValueOnce([{ ...workspace, userRelation: { workspaceMemberId: 15, roleMember: 'viewer' } }]);

    await expect(actions.execute('resolve-workspace-for-create', user, { workspaceRef: workspace.code }))
      .rejects.toBeInstanceOf(ForbiddenException);
    expect(taskService.create).not.toHaveBeenCalled();
  });

  it('resolves a task list from a listed item and delegates task creation', async () => {
    const context: ChatbotUserData = {
      workspaceCode: workspace.code,
      boardCode: 'board-code',
      taskListId: 8,
      taskTitle: 'Create a release checklist',
      taskDescription: 'Checklist for the release',
    };

    const result = await actions.execute('create-task', user, context);

    expect(workspaceService.findOneWorkspace).toHaveBeenCalledWith(workspace.code, user);
    expect(taskService.create).toHaveBeenCalledWith(expect.objectContaining({
      workspaceCode: workspace.code,
      boardCode: 'board-code',
      taskListId: 8,
      title: 'Create a release checklist',
    }));
    expect(result).toEqual({ createdTaskTitle: 'New task', createdTaskCode: 'created-task' });
  });

  it('reuses task, assignment, and comment services for confirmed actions', async () => {
    const taskContext: ChatbotUserData = {
      targetWorkspaceCode: workspace.code,
      targetTaskId: 30,
      targetTaskCode: 'task-code',
      targetTaskTitle: task.title,
      assigneeId: 19,
      assigneeName: 'Other Member',
      commentText: 'Please review this task.',
    };

    await actions.execute('complete-task', user, taskContext);
    await actions.execute('assign-task', user, taskContext);
    await actions.execute('add-comment', user, taskContext);

    expect(taskService.update).toHaveBeenCalledWith(30, { completed: true }, user, workspace.code);
    expect(taskService.assignMember).toHaveBeenCalledWith(30, { workspaceMemberId: 19 }, user.id, workspace.code);
    expect(commentService.create).toHaveBeenCalledWith('Please review this task.', 'task-code', user.id);
  });
});
