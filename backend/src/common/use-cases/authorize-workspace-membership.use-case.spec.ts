import { ForbiddenException } from '@nestjs/common';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { AuthorizeWorkspaceMembershipUseCaseImp } from './authorize-workspace-membership.use-case';
import { Repository } from 'typeorm';

describe('AuthorizeWorkspaceMembershipUseCaseImp', () => {
  const repository = { findOne: jest.fn() };
  let useCase: AuthorizeWorkspaceMembershipUseCaseImp;

  beforeEach(() => {
    jest.clearAllMocks();
    useCase = new AuthorizeWorkspaceMembershipUseCaseImp(repository as unknown as Repository<WorkspaceMember>);
  });

  it('allows an active member when their role is permitted', async () => {
    const membership = { roleMember: 'member' } as WorkspaceMember;
    repository.findOne.mockResolvedValue(membership);

    await expect(useCase.execute('workspace-a', 7, ['owner', 'member'])).resolves.toBe(membership);
    expect(repository.findOne).toHaveBeenCalledWith({
      where: {
        workspace: { code: 'workspace-a', isAvailable: true },
        user: { id: 7, isAvailable: true },
        isAvailable: true,
      },
    });
  });

  it('rejects users who are not active workspace members', async () => {
    repository.findOne.mockResolvedValue(null);

    await expect(useCase.execute('workspace-a', 7)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('rejects members whose role is not permitted', async () => {
    repository.findOne.mockResolvedValue({ roleMember: 'viewer' });

    await expect(useCase.execute('workspace-a', 7, ['owner', 'member'])).rejects.toBeInstanceOf(ForbiddenException);
  });
});
