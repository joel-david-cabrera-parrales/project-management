import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UuidManager } from 'src/common/classes/uuid-manager.class';
import { Profile } from 'src/profile/entities/profile.entity';
import { UserProfile } from '../entities/auth.entity';
import { AuthenticateWithMicrosoftUseCaseImp } from './authenticate-with-microsoft.use-case';

describe('AuthenticateWithMicrosoftUseCaseImp', () => {
  const queryBuilder = {
    where: jest.fn().mockReturnThis(),
    getOne: jest.fn(),
  };
  const users = {
    findOne: jest.fn(),
    createQueryBuilder: jest.fn().mockReturnValue(queryBuilder),
    create: jest.fn((user) => user),
    save: jest.fn((user) => Promise.resolve(user)),
  };
  const profiles = {
    create: jest.fn((profile) => profile),
    save: jest.fn((profile) => Promise.resolve(profile)),
  };
  const uuidService = { generate: jest.fn().mockReturnValue('generated-password') };
  const configService = { get: jest.fn((key: string) => (key === 'APP_NAME' ? 'Task App' : 'http://localhost:4200')) };
  const mailerService = { sendEmail: jest.fn().mockResolvedValue(undefined) };

  let useCase: AuthenticateWithMicrosoftUseCaseImp;

  beforeEach(() => {
    jest.clearAllMocks();
    queryBuilder.getOne.mockReset();
    useCase = new AuthenticateWithMicrosoftUseCaseImp(
      users as unknown as Repository<UserProfile>,
      profiles as unknown as Repository<Profile>,
      uuidService as unknown as UuidManager,
      configService as unknown as ConfigService,
      mailerService as any,
    );
  });

  it('updates the email of an existing Microsoft account and profile', async () => {
    const user = {
      id: 12,
      microsoftId: 'microsoft-id',
      username: 'joel_example.com#EXT#@tenant.onmicrosoft.com',
      profile: { email: 'joel_example.com#EXT#@tenant.onmicrosoft.com' },
    } as UserProfile;
    users.findOne.mockResolvedValue(user);
    queryBuilder.getOne.mockResolvedValue(null);

    await expect(
      useCase.execute({ microsoftId: 'microsoft-id', email: 'Joel@Example.com' }),
    ).resolves.toBe(user);

    expect(user.username).toBe('joel@example.com');
    expect(user.profile.email).toBe('joel@example.com');
    expect(profiles.save).toHaveBeenCalledWith(user.profile);
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('does not overwrite an email already owned by another account', async () => {
    const user = {
      id: 12,
      microsoftId: 'microsoft-id',
      username: 'guest@tenant.onmicrosoft.com',
      profile: { email: 'guest@tenant.onmicrosoft.com' },
    } as UserProfile;
    users.findOne.mockResolvedValue(user);
    queryBuilder.getOne.mockResolvedValue({ id: 13 } as UserProfile);

    await expect(useCase.execute({ microsoftId: 'microsoft-id', email: 'owner@example.com' })).rejects.toBeInstanceOf(
      ConflictException,
    );
    expect(profiles.save).not.toHaveBeenCalled();
    expect(users.save).not.toHaveBeenCalled();
  });

  it('creates a new account using a normalized email address', async () => {
    const profile = { email: 'joel@example.com', createdAt: new Date() } as Profile;
    users.findOne.mockResolvedValue(null);
    queryBuilder.getOne.mockResolvedValue(null);
    profiles.save.mockResolvedValue(profile);

    const createdUser = {
      username: 'joel@example.com',
      microsoftId: 'microsoft-id',
      profile,
    } as UserProfile;
    users.save.mockResolvedValue(createdUser);

    await expect(
      useCase.execute({ microsoftId: 'microsoft-id', email: 'Joel@Example.com' }),
    ).resolves.toBe(createdUser);

    expect(profiles.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'joel@example.com' }));
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({
      username: 'joel@example.com',
      microsoftId: 'microsoft-id',
      isMicrosoftAccount: true,
    }));
  });
});
