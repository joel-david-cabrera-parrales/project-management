import { Injectable, ConflictException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { JwtService } from '@nestjs/jwt';
import { UserProfile } from '../entities/auth.entity';
import { RefreshToken } from '../entities/refresh-token.entity';
import { HashService } from 'src/common/classes/hash-service.class';
import { CreateProfileDto } from '../dto/create-profile.dto';
import { RegisterProfileUseCase } from '../classes/register-profile.class';
import { RegisterProfileResponse } from '../interfaces/register-profile-response.interface';
import { Profile } from 'src/profile/entities/profile.entity';
import { DEFAULT_SETTINGS } from 'src/profile/interfaces/settings.interface';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { welcomeEmailTemplate, WelcomeEmailData } from '../templates/welcome-email.template';
import { ConfigService } from '@nestjs/config';
import { AuthenticationTypesService } from 'src/common/authentication-types/authentication-types.service';

@Injectable()
export class RegisterProfileUseCaseImp extends RegisterProfileUseCase {
  constructor(
    @InjectRepository(UserProfile)
    private readonly repository: Repository<UserProfile>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly hashService: HashService,
    private readonly jwtService: JwtService,
    private readonly mailerService: MailerService,
    private readonly configService: ConfigService,
    private readonly authenticationTypesService: AuthenticationTypesService,
  ) {
    super();
  }

  async execute(profile: CreateProfileDto): Promise<RegisterProfileResponse> {
    // Validaction de datos
    const { username, password, ...restProfile } = profile;
    const user = await this.repository.findOne({ where: { username } });
    if (user) throw new ConflictException('Username already registered');

    // Creacion del perfil de usuario
    const hashedPassword = await this.hashService.hash(profile.password);
    const authenticationType = await this.authenticationTypesService.getRequiredByCode('USER');
    let newProfile: UserProfile;
    try {
      newProfile = await this.repository.manager.transaction(async (manager) => {
        const profile = manager.create(Profile, {
          ...restProfile,
          settings: DEFAULT_SETTINGS as unknown as Record<string, unknown>,
        });
        const savedProfile = await manager.save(profile);

        const credential = manager.create(UserProfile, {
          username,
          password: hashedPassword,
          profile: savedProfile,
          authenticationType,
        });
        const user = await manager.save(credential);

        return user;
      });
    } catch (error) {
      throw error;
    }

    // Generacion del token
    const token = await this.jwtService.signAsync({
      userCode: newProfile.code,
    });

    const refreshTokenExpiresIn = this.configService.get('REFRESH_TOKEN_EXPIRES_IN') || '30d';
    const refreshPayload = { userCode: newProfile.code, type: 'refresh' };
    const refreshToken = this.jwtService.sign(refreshPayload, { expiresIn: refreshTokenExpiresIn });
    const decoded = this.jwtService.decode(refreshToken) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token: refreshToken,
        userCode: newProfile.code,
        expiresAt,
        isAvailable: true,
      }),
    );

    const response: RegisterProfileResponse = {
      token,
      refreshToken,
      user: {
        userCode: newProfile.code,
        profileCode: newProfile.profile.code,
        name: `${newProfile.profile.firstName} ${newProfile.profile.firstSurname}`,
        email: newProfile.profile.email,
        createdAt: newProfile.profile.createdAt,
      },
    };

    const mailData: WelcomeEmailData = {
      name: `${newProfile.profile.firstName} ${newProfile.profile.firstSurname}`,
      email: newProfile.profile.email,
      appName: process.env.APP_NAME || 'Task App',
      dashboardUrl: `${process.env.HOST_FRONTEND || 'http://localhost:4200'}/workspace`,
      createdAt: newProfile.profile.createdAt,
      isGoogleAccount: false,
    };
    const htmlTemplate = welcomeEmailTemplate(mailData);
    this.mailerService
      .sendEmail(newProfile.profile.email, `Bienvenido a ${process.env.APP_NAME || 'Task App'}`, htmlTemplate)
      .catch(() => {});

    return response;
  }
}
