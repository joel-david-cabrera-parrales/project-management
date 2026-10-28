import { ConflictException, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { ConfigService } from '@nestjs/config';
import { Repository } from 'typeorm';
import { UserProfile } from '../entities/auth.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { UuidManager } from 'src/common/classes/uuid-manager.class';
import { DEFAULT_SETTINGS } from 'src/profile/interfaces/settings.interface';
import { AuthenticateWithMicrosoftUseCase, MicrosoftUserProfile } from '../classes/authenticate-with-microsoft.class';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { welcomeEmailTemplate } from '../templates/welcome-email.template';

@Injectable()
export class AuthenticateWithMicrosoftUseCaseImp extends AuthenticateWithMicrosoftUseCase {
  constructor(
    @InjectRepository(UserProfile) private readonly users: Repository<UserProfile>,
    @InjectRepository(Profile) private readonly profiles: Repository<Profile>,
    private readonly uuidService: UuidManager,
    private readonly configService: ConfigService,
    private readonly mailerService: MailerService,
  ) {
    super();
  }

  async execute(microsoftProfile: MicrosoftUserProfile): Promise<UserProfile> {
    const existingProviderUser = await this.users.findOne({
      where: { microsoftId: microsoftProfile.microsoftId },
      relations: { profile: true },
    });
    if (existingProviderUser) {
      const email = microsoftProfile.email.trim().toLowerCase();
      if (existingProviderUser.username.toLowerCase() !== email) {
        const emailOwner = await this.users
          .createQueryBuilder('user')
          .where('LOWER(user.username) = :email', { email })
          .getOne();
        if (emailOwner && emailOwner.id !== existingProviderUser.id) {
          throw new ConflictException('The Microsoft email is already used by another account.');
        }

        existingProviderUser.username = email;
        existingProviderUser.profile.email = email;
        await this.profiles.save(existingProviderUser.profile);
        await this.users.save(existingProviderUser);
      } else if (existingProviderUser.profile.email !== email) {
        existingProviderUser.profile.email = email;
        await this.profiles.save(existingProviderUser.profile);
      }

      return existingProviderUser;
    }

    // An email match alone is not sufficient proof to link identities.
    const email = microsoftProfile.email.trim().toLowerCase();
    const existingEmailUser = await this.users
      .createQueryBuilder('user')
      .where('LOWER(user.username) = :email', { email })
      .getOne();
    if (existingEmailUser) {
      throw new ConflictException('An account with this email already exists. Sign in first to link Microsoft.');
    }

    const profile = await this.profiles.save(
      this.profiles.create({
        firstName: microsoftProfile.firstName || 'Microsoft',
        firstSurname: microsoftProfile.lastName || 'User',
        email,
        phone: [],
        dateBirth: new Date(),
        photo: microsoftProfile.picture,
        isProfileAuthenticated: true,
        settings: DEFAULT_SETTINGS as unknown as Record<string, unknown>,
      }),
    );

    const user = await this.users.save(
      this.users.create({
        username: email,
        password: this.uuidService.generate(),
        microsoftId: microsoftProfile.microsoftId,
        isMicrosoftAccount: true,
        profile,
        isAvailable: true,
      }),
    );

    const appName = this.configService.get('APP_NAME') || 'Task App';
    const dashboardUrl = `${this.configService.get('HOST_FRONTEND') || 'http://localhost:4200'}/workspace`;
    const html = welcomeEmailTemplate({
      name: `${profile.firstName} ${profile.firstSurname}`,
      email: profile.email,
      appName,
      dashboardUrl,
      createdAt: profile.createdAt,
      isGoogleAccount: false,
    });
    this.mailerService.sendEmail(profile.email, `Bienvenido a ${appName}`, html).catch(() => {});

    return user;
  }
}
