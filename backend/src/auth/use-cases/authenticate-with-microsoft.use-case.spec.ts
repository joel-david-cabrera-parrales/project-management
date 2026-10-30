import { ConflictException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UuidManager } from 'src/common/classes/uuid-manager.class';
import { Profile } from 'src/profile/entities/profile.entity';
import { UserProfile } from '../entities/auth.entity';
import { AuthenticateWithMicrosoftUseCaseImp } from './authenticate-with-microsoft.use-case';

describe('AuthenticateWithMicrosoftUseCaseImp', () => {
  const queryBuilder = {
    leftJoinAndSelect: jest.fn().mockReturnThis(),
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
  const authenticationTypesService = {
    getRequiredByCode: jest.fn((code: string) => Promise.resolve({ code, name: code })),
  };

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
      authenticationTypesService as any,
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

  it('automatically links Microsoft to an existing account by normalized email', async () => {
    const user = {
      id: 12,
      username: 'Joel@Example.com',
      microsoftId: undefined,
      isMicrosoftAccount: false,
      profile: { email: 'old-email@example.com' },
    } as UserProfile;
    users.findOne.mockResolvedValue(null);
    queryBuilder.getOne.mockResolvedValue(user);

    await expect(
      useCase.execute({
        microsoftId: 'microsoft-id',
        email: 'joel@example.com',
      }),
    ).resolves.toBe(user);

    expect(user.microsoftId).toBe('microsoft-id');
    expect(user.isMicrosoftAccount).toBe(true);
    expect(user.username).toBe('joel@example.com');
    expect(user.profile.email).toBe('joel@example.com');
    expect(profiles.save).toHaveBeenCalledWith(user.profile);
    expect(users.save).toHaveBeenCalledWith(user);
  });

  it('does not replace a different Microsoft identity already linked to the matching email', async () => {
    const emailOwner = {
      id: 12,
      username: 'user@example.com',
      microsoftId: 'first-microsoft-id',
      isMicrosoftAccount: true,
      profile: { email: 'user@example.com' },
    } as UserProfile;
    users.findOne.mockResolvedValue(null);
    queryBuilder.getOne.mockResolvedValue(emailOwner);

    await expect(useCase.execute({
        microsoftId: 'second-microsoft-id',
        email: 'user@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

  it('creates an account when the Microsoft email is not registered', async () => {
    const profile = { email: 'new@example.com', createdAt: new Date() } as Profile;
    users.findOne.mockResolvedValue(null);
    queryBuilder.getOne.mockResolvedValue(null);
    profiles.save.mockResolvedValue(profile);

    const createdUser = {
      username: 'new@example.com',
      microsoftId: 'microsoft-id',
      profile,
    } as UserProfile;
    users.save.mockResolvedValue(createdUser);

    await expect(
      useCase.execute({ microsoftId: 'microsoft-id', email: 'New@Example.com' }),
    ).resolves.toBe(createdUser);

    expect(profiles.create).toHaveBeenCalledWith(expect.objectContaining({ email: 'new@example.com' }));
    expect(users.create).toHaveBeenCalledWith(expect.objectContaining({
      username: 'new@example.com',
      microsoftId: 'microsoft-id',
      isMicrosoftAccount: true,
    }));
  });

  it('continues to use the provider ID on subsequent logins', async () => {
    const user = {
      id: 12,
      microsoftId: 'microsoft-id',
      username: 'user@example.com',
      profile: { email: 'user@example.com' },
    } as UserProfile;
    users.findOne.mockResolvedValue(user);

    await expect(useCase.execute({
      microsoftId: 'microsoft-id',
      email: 'user@example.com',
    })).resolves.toBe(user);

    expect(queryBuilder.getOne).not.toHaveBeenCalled();
  });

  it('rejects email linking when the email is already associated with another Microsoft ID', async () => {
    const emailOwner = { id: 12, microsoftId: 'first-microsoft-id' } as UserProfile;
    users.findOne.mockResolvedValue(null);
    queryBuilder.getOne.mockResolvedValue(emailOwner);

    await expect(
      useCase.execute({
        microsoftId: 'microsoft-id',
        email: 'owner@example.com',
      }),
    ).rejects.toBeInstanceOf(ConflictException);
    expect(users.save).not.toHaveBeenCalled();
  });

});
