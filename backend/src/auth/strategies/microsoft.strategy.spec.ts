import { ConfigService } from '@nestjs/config';
import { UnauthorizedException } from '@nestjs/common';
import { MicrosoftStrategy } from './microsoft.strategy';

describe('MicrosoftStrategy', () => {
  let strategy: MicrosoftStrategy;
  const fetchMock = jest.fn();

  const configService = {
    get: jest.fn((key: string) =>
      ({
        MICROSOFT_TENANT_ID: 'common',
        MICROSOFT_CLIENT_ID: 'client-id',
        MICROSOFT_CLIENT_SECRET: 'client-secret',
        MICROSOFT_CALLBACK_URL: 'http://localhost:3000/api/v1/auth/microsoft/callback',
      })[key],
    ),
  };

  beforeEach(() => {
    jest.clearAllMocks();
    strategy = new MicrosoftStrategy(configService as unknown as ConfigService);
    Object.defineProperty(globalThis, 'fetch', { configurable: true, value: fetchMock, writable: true });
  });

  it('prefers the mail property and normalizes the address', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'microsoft-id',
          mail: 'Joel@Example.com',
          otherMails: ['alternate@example.com'],
          userPrincipalName: 'joel_example.com#EXT#@tenant.onmicrosoft.com',
        }),
        { status: 200 },
      ),
    );

    await expect(strategy.validate('access-token')).resolves.toMatchObject({
      microsoftId: 'microsoft-id',
      email: 'joel@example.com',
    });
  });

  it('uses otherMails instead of a guest UPN containing #EXT#', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'microsoft-id',
          otherMails: [' Joel@Example.com '],
          userPrincipalName: 'joel_example.com#EXT#@tenant.onmicrosoft.com',
        }),
        { status: 200 },
      ),
    );

    await expect(strategy.validate('access-token')).resolves.toMatchObject({ email: 'joel@example.com' });
  });

  it('rejects a guest UPN if Microsoft provides no usable email', async () => {
    fetchMock.mockResolvedValue(
      new Response(
        JSON.stringify({
          id: 'microsoft-id',
          userPrincipalName: 'joel_example.com#EXT#@tenant.onmicrosoft.com',
        }),
        { status: 200 },
      ),
    );

    await expect(strategy.validate('access-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rejects when Microsoft Graph cannot return the profile', async () => {
    fetchMock.mockResolvedValue(new Response('', { status: 503 }));

    await expect(strategy.validate('access-token')).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
