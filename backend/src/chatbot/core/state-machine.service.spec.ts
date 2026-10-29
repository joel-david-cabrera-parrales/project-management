import { AuthenticatedUserDto } from 'src/auth/dto/authenticated-user.dto';
import { TASK_ASSISTANT_FLOW } from '../flows/task-assistant.flow';
import { ChatbotActionExecutor } from '../classes/chatbot-action-executor.class';
import { StateMachineService } from './state-machine.service';

describe('StateMachineService', () => {
  const user = AuthenticatedUserDto.fromUserProfile(7, 'user-code');
  let execute: jest.Mock;
  let stateMachine: StateMachineService;

  beforeEach(() => {
    execute = jest.fn();
    stateMachine = new StateMachineService({ execute } as unknown as ChatbotActionExecutor);
  });

  it('starts with the warm assistant greeting', () => {
    const result = stateMachine.start(TASK_ASSISTANT_FLOW, {});

    expect(result.state).toBe('welcome');
    expect(result.responses.join(' ')).toContain('Lumi');
    expect(result.responses.join(' ')).toContain('😊');
    expect(result.completed).toBe(false);
  });

  it('executes only the selected task action and renders its result', async () => {
    execute.mockResolvedValue({ taskSummary: 'TASK-1 — Preparar demo' });
    const data = {};

    const result = await stateMachine.transition(TASK_ASSISTANT_FLOW, 'welcome', 'Ver mis tareas', data, user);

    expect(execute).toHaveBeenCalledWith('list-my-tasks', user, expect.objectContaining({ intent: 'Ver mis tareas' }));
    expect(result.state).toBe('my-tasks');
    expect(result.responses.join(' ')).toContain('TASK-1 — Preparar demo');
    expect(result.completed).toBe(true);
  });

  it('keeps the current state and returns a friendly response for invalid choices', async () => {
    const result = await stateMachine.transition(TASK_ASSISTANT_FLOW, 'welcome', 'anything', {}, user);

    expect(execute).not.toHaveBeenCalled();
    expect(result.success).toBe(false);
    expect(result.state).toBe('welcome');
    expect(result.responses[0]).toContain('😅');
  });
});
