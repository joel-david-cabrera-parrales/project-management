import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Repository } from 'typeorm';
import { InjectRepository } from '@nestjs/typeorm';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { UuidManager } from 'src/common/classes/uuid-manager.class';
import { CreateProfileDto } from './dto/create-profile.dto';
import { CredentialDto } from './dto/credential.dto';
import { ChangePasswordDto } from './dto/change-password.dto';
import { UserProfile } from './entities/auth.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { AuthenticateUserUseCase } from './classes/authenticate-user.class';
import { RegisterProfileUseCase } from './classes/register-profile.class';
import { ChangePasswordUseCase } from './classes/change-password.class';
import { IUserCredential } from './interfaces/user-credential.interface';
import { MailerService } from 'src/common/services/mailer/mailer.service';
import { DEFAULT_SETTINGS } from 'src/profile/interfaces/settings.interface';
import { welcomeEmailTemplate, WelcomeEmailData } from './templates/welcome-email.template';
import { loginNotificationTemplate, LoginNotificationData } from './templates/login-notification.template';
import { passwordResetTemplate, PasswordResetData } from './templates/password-reset.template';
import { ForgotPasswordDto } from './dto/forgot-password.dto';
import { HashService } from 'src/common/classes/hash-service.class';
import { loginResponse } from 'src/common/responses';
import { AuthenticatedUserDto } from './dto/authenticated-user.dto';
import { v4 as uuidv4 } from 'uuid';
import { AuthenticateWithMicrosoftUseCase } from './classes/authenticate-with-microsoft.class';
import { AuthenticationTypesService } from 'src/common/authentication-types/authentication-types.service';
import { S3Service } from 'src/common/services/s3/s3.service';

interface GoogleProfile {
  googleId: string;
  email: string;
  firstName?: string;
  lastName?: string;
  picture?: string;
  accessToken: string;
  refreshToken?: string;
}

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(UserProfile)
    private readonly repository: Repository<UserProfile>,
    @InjectRepository(Profile)
    private readonly profileRepository: Repository<Profile>,
    @InjectRepository(RefreshToken)
    private readonly refreshTokenRepository: Repository<RefreshToken>,
    private readonly uuidService: UuidManager,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,

    private readonly authenticateUserUseCase: AuthenticateUserUseCase,
    private readonly registerProfileUseCase: RegisterProfileUseCase,
    private readonly changePasswordUseCase: ChangePasswordUseCase,
    private readonly mailerService: MailerService,
    private readonly bcrypt: HashService,
    private readonly authenticateWithMicrosoftUseCase: AuthenticateWithMicrosoftUseCase,
    private readonly authenticationTypesService: AuthenticationTypesService,
    private readonly s3Service: S3Service,
  ) {}

  async registerProfile(profile: CreateProfileDto) {
    return this.registerProfileUseCase.execute(profile);
  }

  async authenticate(credential: CredentialDto) {
    const { username, password } = credential;
    const user = await this.findOne(username);

    return this.authenticateUserUseCase.execute(user, password);
  }

  private async findOne(term: string) {
    let user: UserProfile | null = null;
    if (this.uuidService.validate(term)) {
      user = await this.repository.findOne({
        where: { code: term },
        relations: { profile: true },
      });
    } else {
      user = await this.repository.findOne({
        where: { username: term },
        relations: { profile: true },
      });
    }

    if (!user) throw new NotFoundException('Credential is missing');

    return user;
  }

  async existCredential(email: string): Promise<IUserCredential> {
    const user = await this.repository.findOne({ where: { username: email }, relations: { profile: true } });
    if (!user) throw new NotFoundException('Credential is missing');
    // Mapeas la entidad al modelo de respuesta
    return {
      id: user.id,
      code: user.code,
      email: user.username,
      firstName: user.profile.firstName,
      lastName: user.profile.firstSurname,
    };
  }

  async changePassword(userCode: string, dto: ChangePasswordDto): Promise<void> {
    return this.changePasswordUseCase.execute(userCode, dto);
  }

  async isValidUser(code: string): Promise<IUserCredential> {
    const user = await this.findOne(code);
    if (!user) throw new NotFoundException('Credential is missing');
    // Mapeas la entidad al modelo de respuesta
    return {
      id: user.id,
      code: user.code,
      email: user.username,
      firstName: user.profile.firstName,
      lastName: user.profile.firstSurname,
    };
  }

  async sendPasswordResetCode(dto: ForgotPasswordDto): Promise<void> {
    const { email } = dto;
    const user = await this.repository.findOne({ where: { username: email }, relations: { profile: true } });
    if (!user) return;

    const resetCode = Math.floor(100000000 + Math.random() * 900000000).toString();
    const expirationMinutes = 15;
    const expiresAt = new Date(Date.now() + expirationMinutes * 60 * 1000);

    user.resetPasswordCode = resetCode;
    user.resetPasswordExpiresAt = expiresAt;
    await this.repository.save(user);

    const mailData: PasswordResetData = {
      name: `${user.profile.firstName} ${user.profile.firstSurname}`,
      email: user.username,
      appName: this.configService.get('APP_NAME') || 'Task App',
      resetCode,
      expirationMinutes,
    };
    const htmlTemplate = passwordResetTemplate(mailData);
    this.mailerService
      .sendEmail(
        user.username,
        `Código de verificación - Restablece tu contraseña - ${this.configService.get('APP_NAME') || 'Task App'}`,
        htmlTemplate,
      )
      .catch(() => {});
  }

  async verifyResetCode(code: string): Promise<loginResponse> {
    const user = await this.repository.findOne({
      where: { resetPasswordCode: code },
      relations: { profile: true, authenticationType: true },
    });

    if (!user) throw new NotFoundException('Código de verificación inválido');
    if (user.resetPasswordExpiresAt! < new Date()) throw new BadRequestException('Código de verificación expirado');

    const token = await this.jwtService.signAsync({
      userCode: user.code,
    });

    const refreshToken = await this.generateRefreshToken(user.code);

    const authenticationType = user.authenticationType;
    user.resetPasswordCode = undefined;
    if (authenticationType.code !== 'USER') {
      user.resetPasswordExpiresAt = undefined;
    }
    await this.repository.save(user);

    return {
      token,
      refreshToken,
      user: { userCode: user.code, profileCode: user.profile.code },
      authenticationType: { code: authenticationType.code, name: authenticationType.name },
    };
  }

  async resetPassword(user: AuthenticatedUserDto, dto: { password: string }): Promise<void> {
    const { password } = dto;
    const userProfile = await this.repository.findOne({
      where: { code: user.code },
    });

    if (!userProfile) throw new NotFoundException('Usuario no encontrado');
    if (!userProfile.resetPasswordExpiresAt || userProfile.resetPasswordExpiresAt < new Date())
      throw new BadRequestException('Código de verificación expirado');

    userProfile.password = await this.bcrypt.hash(password);
    userProfile.resetPasswordCode = undefined;
    userProfile.resetPasswordExpiresAt = undefined;
    await this.repository.save(userProfile);
  }

  async findOrCreateByGoogle(googleProfile: GoogleProfile): Promise<UserProfile> {
    let user = await this.repository.findOne({
      where: { googleId: googleProfile.googleId },
      relations: { profile: true },
    });

    if (user) {
      const mailData: LoginNotificationData = {
        name: `${user.profile.firstName} ${user.profile.firstSurname}`,
        email: user.username,
        appName: this.configService.get('APP_NAME') || 'Task App',
        loginTime: new Date(),
        dashboardUrl: `${this.configService.get('HOST_FRONTEND') || 'http://localhost:4200'}/workspace`,
      };
      const htmlTemplate = loginNotificationTemplate(mailData);
      this.mailerService
        .sendEmail(
          user.username,
          `Nuevo inicio de sesión - ${this.configService.get('APP_NAME') || 'Task App'}`,
          htmlTemplate,
        )
        .catch(() => {});
      return user;
    }

    user = await this.repository.findOne({
      where: { username: googleProfile.email },
      relations: { profile: true },
    });

    if (user) {
      user.googleId = googleProfile.googleId;
      user.isGoogleAccount = true;
      await this.repository.save(user);

      if (googleProfile.picture && !user.profile.photo) {
        const storedPhoto = await this.downloadAndStoreGooglePhoto(googleProfile.picture);
        if (storedPhoto) {
          user.profile.photo = storedPhoto;
          await this.profileRepository.save(user.profile);
        }
      }

      const mailData: LoginNotificationData = {
        name: `${user.profile.firstName} ${user.profile.firstSurname}`,
        email: user.username,
        appName: this.configService.get('APP_NAME') || 'Task App',
        loginTime: new Date(),
        dashboardUrl: `${this.configService.get('HOST_FRONTEND') || 'http://localhost:4200'}/workspace`,
      };
      const htmlTemplate = loginNotificationTemplate(mailData);
      this.mailerService
        .sendEmail(
          user.username,
          `Nuevo inicio de sesión - ${this.configService.get('APP_NAME') || 'Task App'}`,
          htmlTemplate,
        )
        .catch(() => {});

      return user;
    }

    const storedPhoto = googleProfile.picture ? await this.downloadAndStoreGooglePhoto(googleProfile.picture) : null;

    const profile = this.profileRepository.create({
      firstName: googleProfile.firstName || 'Google',
      firstSurname: googleProfile.lastName || 'User',
      email: googleProfile.email,
      phone: [],
      dateBirth: new Date(),
      photo: storedPhoto ?? googleProfile.picture,
      isProfileAuthenticated: true,
      settings: DEFAULT_SETTINGS as unknown as Record<string, unknown>,
    });
    const savedProfile = await this.profileRepository.save(profile);

    const newUser = this.repository.create({
      username: googleProfile.email,
      password: this.uuidService.generate(),
      googleId: googleProfile.googleId,
      isGoogleAccount: true,
      profile: savedProfile,
      authenticationType: await this.authenticationTypesService.getRequiredByCode('GOOGLE'),
      isAvailable: true,
    });

    const createdUser = await this.repository.save(newUser);

    const mailData: WelcomeEmailData = {
      name: `${savedProfile.firstName} ${savedProfile.firstSurname}`,
      email: savedProfile.email,
      appName: this.configService.get('APP_NAME') || 'Task App',
      dashboardUrl: `${this.configService.get('HOST_FRONTEND') || 'http://localhost:4200'}/workspace`,
      createdAt: savedProfile.createdAt,
      isGoogleAccount: true,
    };
    const htmlTemplate = welcomeEmailTemplate(mailData);
    this.mailerService
      .sendEmail(savedProfile.email, `Bienvenido a ${this.configService.get('APP_NAME') || 'Task App'}`, htmlTemplate)
      .catch(() => {});

    return createdUser;
  }

  async authenticateWithMicrosoft(profile: { microsoftId: string; email: string; firstName?: string; lastName?: string }) {
    return this.authenticateWithMicrosoftUseCase.execute(profile);
  }

  private async downloadAndStoreGooglePhoto(pictureUrl: string): Promise<string | null> {
    try {
      const response = await fetch(pictureUrl);
      if (!response.ok) return null;

      const arrayBuffer = await response.arrayBuffer();
      const buffer = Buffer.from(arrayBuffer);

      const contentType = response.headers.get('content-type') || 'image/jpeg';
      const extMap: Record<string, string> = {
        'image/jpeg': '.jpg',
        'image/png': '.png',
        'image/webp': '.webp',
        'image/gif': '.gif',
      };
      const ext = extMap[contentType] || '.jpg';

      const key = `profiles/${uuidv4()}${ext}`;
      await this.s3Service.putObject(key, buffer, contentType);
      return key;
    } catch {
      return null;
    }
  }

  generateJwt(user: UserProfile): string {
    const payload = {
      sub: user.id,
      userCode: user.code,
      email: user.username,
      isGoogleAccount: user.isGoogleAccount,
      isMicrosoftAccount: user.isMicrosoftAccount,
    };
    return this.jwtService.sign(payload);
  }

  async generateRefreshToken(userCode: string): Promise<string> {
    const refreshTokenExpiresIn = this.configService.get('REFRESH_TOKEN_EXPIRES_IN') || '30d';
    const payload = { userCode, type: 'refresh' };
    const token = this.jwtService.sign(payload, { expiresIn: refreshTokenExpiresIn });

    const decoded = this.jwtService.decode(token) as { exp: number };
    const expiresAt = new Date(decoded.exp * 1000);

    await this.refreshTokenRepository.save(
      this.refreshTokenRepository.create({
        token,
        userCode,
        expiresAt,
        isAvailable: true,
      }),
    );

    return token;
  }

  async refreshAccessToken(refreshTokenStr: string): Promise<loginResponse> {
    let payload: { userCode: string; type: string };
    try {
      payload = this.jwtService.verify(refreshTokenStr);
    } catch {
      throw new UnauthorizedException('Invalid or expired refresh token');
    }

    if (payload.type !== 'refresh') {
      throw new UnauthorizedException('Invalid token type');
    }

    const storedToken = await this.refreshTokenRepository.findOne({
      where: { token: refreshTokenStr, isAvailable: true },
    });

    if (!storedToken) {
      throw new UnauthorizedException('Refresh token has been revoked');
    }

    if (new Date() > storedToken.expiresAt) {
      throw new UnauthorizedException('Refresh token has expired');
    }

    storedToken.isAvailable = false;
    await this.refreshTokenRepository.save(storedToken);

    const user = await this.repository.findOne({
      where: { code: payload.userCode },
      relations: { profile: true },
    });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const token = await this.jwtService.signAsync({ userCode: user.code });
    const newRefreshToken = await this.generateRefreshToken(user.code);

    return {
      token,
      refreshToken: newRefreshToken,
      user: { userCode: user.code, profileCode: user.profile.code },
    };
  }

  // create(createAuthDto: CreateAuthDto) {
  //   return 'This action adds a new auth';
  // }

  // findAll() {
  //   return `This action returns all auth`;
  // }

  // findOne(id: number) {
  //   return `This action returns a #${id} auth`;
  // }

  // update(id: number, updateAuthDto: UpdateAuthDto) {
  //   return `This action updates a #${id} auth`;
  // }

  // remove(id: number) {
  //   return `This action removes a #${id} auth`;
  // }
}
