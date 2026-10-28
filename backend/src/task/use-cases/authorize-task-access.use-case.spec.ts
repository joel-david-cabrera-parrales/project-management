import { ForbiddenException } from '@nestjs/common';
import { Task } from '../entities/task.entity';
import { AuthorizeTaskAccessUseCaseImp } from './authorize-task-access.use-case';
import { Repository } from 'typeorm';

describe('AuthorizeTaskAccessUseCaseImp', () => {
  const taskRepository = { findOne: jest.fn() };
  const workspaceMembership = { execute: jest.fn() };
  let useCase: AuthorizeTaskAccessUseCaseImp;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AuthorizeTaskAccessUseCaseImp(taskRepository as unknown as Repository<Task>, workspaceMembership);
  });

  it('checks access against the task actual workspace', async () => {
    const task = {
      taskList: { board: { workspace: { code: 'workspace-b' } } },
    } as Task;
    taskRepository.findOne.mockResolvedValue(task);

    await expect(useCase.execute(13, 7, ['owner', 'member'], 'workspace-b')).resolves.toBe(task);
    expect(workspaceMembership.execute.mock.calls).toContainEqual(['workspace-b', 7, ['owner', 'member']]);
  });

  it('rejects an IDOR attempt using a different workspace code', async () => {
    taskRepository.findOne.mockResolvedValue({
      taskList: { board: { workspace: { code: 'workspace-b' } } },
    });

    await expect(useCase.execute(13, 7, ['owner'], 'workspace-a')).rejects.toBeInstanceOf(ForbiddenException);
    expect(workspaceMembership.execute.mock.calls).toHaveLength(0);
  });
});
