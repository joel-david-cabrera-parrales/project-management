import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { ProfilePhotoController } from './profile-photo.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Profile } from './entities/profile.entity';
import { AuthModule } from 'src/auth/auth.module';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { GetProfileUseCase } from './classes/get-profile.class';
import { GetProfileUseCaseImp } from './use-cases/get-profile.use-case';
import { GetMyProfileUseCase } from './classes/get-my-profile.class';
import { GetMyProfileUseCaseImp } from './use-cases/get-my-profile.use-case';
import { UpdateMyProfileUseCase } from './classes/update-my-profile.class';
import { UpdateMyProfileUseCaseImp } from './use-cases/update-my-profile.use-case';
import { GetSettingsUseCase } from './classes/get-settings.class';
import { GetSettingsUseCaseImp } from './use-cases/get-settings.use-case';
import { UpdateSettingsUseCase } from './classes/update-settings.class';
import { UpdateSettingsUseCaseImp } from './use-cases/update-settings.use-case';
import { ConfigModule } from '@nestjs/config';
import { CommonModule } from 'src/common/common.module';

@Module({
  providers: [
    ProfileService,
    { provide: GetProfileUseCase, useClass: GetProfileUseCaseImp },
    { provide: GetMyProfileUseCase, useClass: GetMyProfileUseCaseImp },
    { provide: UpdateMyProfileUseCase, useClass: UpdateMyProfileUseCaseImp },
    { provide: GetSettingsUseCase, useClass: GetSettingsUseCaseImp },
    { provide: UpdateSettingsUseCase, useClass: UpdateSettingsUseCaseImp },
  ],
  controllers: [ProfileController, ProfilePhotoController],
  imports: [TypeOrmModule.forFeature([Profile, UserProfile]), AuthModule, ConfigModule, CommonModule],
  exports: [TypeOrmModule],
})
export class ProfileModule {}
