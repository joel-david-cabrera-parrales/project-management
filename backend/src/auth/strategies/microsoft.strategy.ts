import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { Strategy } from 'passport-oauth2';
import { ConfigService } from '@nestjs/config';

interface MicrosoftGraphUser {
  id: string;
  displayName?: string;
  givenName?: string;
  surname?: string;
  mail?: string;
  otherMails?: string[];
  userPrincipalName?: string;
}

function isEmail(value?: string): value is string {
  return !!value && !value.includes('#EXT#') && /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
}

@Injectable()
export class MicrosoftStrategy extends PassportStrategy(Strategy, 'microsoft') {
  constructor(configService: ConfigService) {
    const tenant = configService.get('MICROSOFT_TENANT_ID') || 'common';
    super({
      authorizationURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/authorize`,
      tokenURL: `https://login.microsoftonline.com/${tenant}/oauth2/v2.0/token`,
      clientID: configService.get('MICROSOFT_CLIENT_ID') || '',
      clientSecret: configService.get('MICROSOFT_CLIENT_SECRET') || '',
      callbackURL: configService.get('MICROSOFT_CALLBACK_URL') || '',
      scope: ['openid', 'profile', 'email', 'User.Read'],
      skipUserProfile: true,
      state: true,
      customHeaders: { 'User-Agent': 'task-app' },
    });
  }

  async validate(accessToken: string): Promise<Record<string, string | undefined>> {
    const response = await fetch(
      'https://graph.microsoft.com/v1.0/me?$select=id,displayName,givenName,surname,mail,otherMails,userPrincipalName',
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );
    if (!response.ok) throw new UnauthorizedException('Could not retrieve Microsoft account profile');

    const profile = (await response.json()) as MicrosoftGraphUser;
    const emailCandidate = [profile.mail, ...(profile.otherMails || []), profile.userPrincipalName].find(isEmail);
    if (!profile.id || !emailCandidate) {
      throw new UnauthorizedException('Microsoft did not provide a usable email address for this account');
    }

    return {
      microsoftId: profile.id,
      email: emailCandidate.trim().toLowerCase(),
      firstName: profile.givenName || profile.displayName?.split(' ')[0],
      lastName: profile.surname || profile.displayName?.split(' ').slice(1).join(' '),
    };
  }
}
