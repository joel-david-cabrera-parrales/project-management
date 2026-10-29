import { NotFoundException } from '@nestjs/common';
import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { StateMachineService } from './core/state-machine.service';
import { ChatbotActionExecutor } from './classes/chatbot-action-executor.class';
import { ManageChatbotConversationsUseCaseImp } from './use-cases/manage-chatbot-conversations.use-case';

describe('ManageChatbotConversationsUseCaseImp', () => {
  const user = AuthenticatedUserDto.fromUserProfile(12, 'user-code-12');
  let service: ManageChatbotConversationsUseCaseImp;
  let executeAction: jest.Mock;
  let repository: {
    create: jest.Mock;
    save: jest.Mock;
    findOneBy: jest.Mock;
  };

  beforeEach(() => {
    repository = {
      create: jest.fn((value) => ({ ...value, id: value.id ?? 'conversation-uuid' })),
      save: jest.fn(async (value) => ({
        ...value,
        id: value.id ?? 'conversation-uuid',
        createdAt: value.createdAt ?? new Date('2026-01-01T00:00:00.000Z'),
        updatedAt: new Date('2026-01-01T00:01:00.000Z'),
      })),
      findOneBy: jest.fn(),
    };
    executeAction = jest.fn().mockResolvedValue({});
    const actions = { execute: executeAction } as unknown as ChatbotActionExecutor;
    service = new ManageChatbotConversationsUseCaseImp(repository as any, new StateMachineService(actions));
  });

  it('persists a conversation with the authenticated user id and greeting history', async () => {
    const result = await service.startConversation(user);

    expect(repository.save).toHaveBeenCalledWith(expect.objectContaining({ userId: user.id, flowId: 'task-assistant' }));
    expect(result.id).toBe('conversation-uuid');
    expect(result.input).toMatchObject({ type: 'choice', options: expect.arrayContaining(['Ver mis tareas', 'Crear una tarea']) });
    expect(result.history[0]).toMatchObject({ sender: 'assistant' });
  });

  it('persists user and assistant messages after a valid flow transition', async () => {
    const conversation = await service.startConversation(user);
    repository.findOneBy.mockResolvedValueOnce({
      id: conversation.id,
      userId: user.id,
      flowId: 'task-assistant',
      currentState: 'welcome',
      userData: {},
      history: conversation.history,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });

    const result = await service.processMessage(user, conversation.id, 'Ayuda');

    expect(result.state).toBe('help');
    expect(result.completed).toBe(true);
    expect(result.history.some((message: { sender: string; content: string }) => message.sender === 'user' && message.content === 'Ayuda')).toBe(true);
    expect(repository.save).toHaveBeenLastCalledWith(expect.objectContaining({ currentState: 'help', completed: true }));
  });

  it('persists task cards as structured assistant content for the frontend reveal animation', async () => {
    const conversation = await service.startConversation(user);
    repository.findOneBy.mockResolvedValueOnce({
      id: conversation.id,
      userId: user.id,
      flowId: 'task-assistant',
      currentState: 'welcome',
      userData: {},
      history: conversation.history,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    executeAction.mockResolvedValueOnce({
      taskSummary: '',
      taskCards: [{ taskCode: 'task-1', title: 'Preparar demo', workspaceName: 'Equipo' }],
    });

    const result = await service.processMessage(user, conversation.id, 'Ver mis tareas');

    expect(result.history.find((message) => message.tasks)?.tasks).toEqual([
      { taskCode: 'task-1', title: 'Preparar demo', workspaceName: 'Equipo' },
    ]);
    expect(repository.save.mock.lastCall?.[0].userData.taskCards).toBeUndefined();
  });

  it('persists selectable lists as structured assistant content', async () => {
    const conversation = await service.startConversation(user);
    repository.findOneBy.mockResolvedValueOnce({
      id: conversation.id,
      userId: user.id,
      flowId: 'task-assistant',
      currentState: 'welcome',
      userData: {},
      history: conversation.history,
      completed: false,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    executeAction.mockResolvedValueOnce({
      workspaceSummary: '',
      workspaceItems: [{ id: 'workspace-code', value: 'workspace-code', kind: 'workspace', title: 'Diseño' }],
    });

    const result = await service.processMessage(user, conversation.id, 'Crear una tarea');

    expect(result.history.find((message) => message.items)?.items).toEqual([
      { id: 'workspace-code', value: 'workspace-code', kind: 'workspace', title: 'Diseño' },
    ]);
  });

  it('does not expose another user conversation by id', async () => {
    repository.findOneBy.mockResolvedValueOnce(null);

    await expect(service.getConversation(user, 'foreign-conversation-id')).rejects.toBeInstanceOf(NotFoundException);
    expect(repository.findOneBy).toHaveBeenCalledWith({ id: 'foreign-conversation-id', userId: user.id });
  });
});
