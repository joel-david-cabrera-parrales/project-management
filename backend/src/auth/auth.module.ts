import { Module } from '@nestjs/common';
import { AuthService } from './auth.service';
import { AuthController } from './auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserProfile } from './entities/auth.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { Profile } from 'src/profile/entities/profile.entity';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';

import { CommonModule } from 'src/common/common.module';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { PassportModule } from '@nestjs/passport';
import { JwtModule } from '@nestjs/jwt';
import { JwtStrategy } from './strategies/jwt.strategy';
import { GoogleStrategy } from './strategies/google.strategy';
import { MicrosoftStrategy } from './strategies/microsoft.strategy';
import { AuthenticateUserUseCase } from './classes/authenticate-user.class';
import { AuthenticateUserUseCaseImp } from './use-cases/authenticate-user.use-case';
import { RegisterProfileUseCase } from './classes/register-profile.class';
import { RegisterProfileUseCaseImp } from './use-cases/register-profile.use-case';
import { ChangePasswordUseCase } from './classes/change-password.class';
import { ChangePasswordUseCaseImp } from './use-cases/change-password.use-case';
import { WorkspaceRoleGuard } from './guards/workspace-role.guard';
import { AuthenticateWithMicrosoftUseCase } from './classes/authenticate-with-microsoft.class';
import { AuthenticateWithMicrosoftUseCaseImp } from './use-cases/authenticate-with-microsoft.use-case';

@Module({
  controllers: [AuthController],
  providers: [
    AuthService,
    JwtStrategy,
    GoogleStrategy,
    MicrosoftStrategy,
    WorkspaceRoleGuard,
    {
      provide: AuthenticateUserUseCase,
      useClass: AuthenticateUserUseCaseImp,
    },
    {
      provide: RegisterProfileUseCase,
      useClass: RegisterProfileUseCaseImp,
    },
    {
      provide: ChangePasswordUseCase,
      useClass: ChangePasswordUseCaseImp,
    },
    {
      provide: AuthenticateWithMicrosoftUseCase,
      useClass: AuthenticateWithMicrosoftUseCaseImp,
    },
  ],
  imports: [
    ConfigModule,
    PassportModule.register({ defaultStrategy: 'jwt' }),
    JwtModule.registerAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        secret: configService.get('JWT_SECRET'),
        signOptions: {
          expiresIn: configService.get('JWT_EXPIRES_IN'),
        },
      }),
    }),
    TypeOrmModule.forFeature([UserProfile, Profile, WorkspaceMember, RefreshToken]),
    CommonModule,
  ],
  exports: [AuthService, JwtStrategy, PassportModule, JwtModule, TypeOrmModule, WorkspaceRoleGuard],
})
export class AuthModule {}
