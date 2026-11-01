import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { UpdateSettingsDto } from './dto/update-settings.dto';
import { GetProfileUseCase } from './classes/get-profile.class';
import { GetMyProfileUseCase } from './classes/get-my-profile.class';
import { UpdateMyProfileUseCase } from './classes/update-my-profile.class';
import { GetSettingsUseCase } from './classes/get-settings.class';
import { UpdateSettingsUseCase } from './classes/update-settings.class';
import { Profile } from './entities/profile.entity';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { toPhotoUrl } from '../common/helpers/photo-url.helper';
import { v4 as uuidv4 } from 'uuid';
import { S3Service } from 'src/common/services/s3/s3.service';
import { createReadStream, existsSync } from 'fs';
import * as path from 'path';
import { Readable } from 'stream';

@Injectable()
export class ProfileService {
  constructor(
    private readonly getProfileUseCase: GetProfileUseCase,
    private readonly getMyProfileUseCase: GetMyProfileUseCase,
    private readonly updateMyProfileUseCase: UpdateMyProfileUseCase,
    private readonly getSettingsUseCase: GetSettingsUseCase,
    private readonly updateSettingsUseCase: UpdateSettingsUseCase,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
    @InjectRepository(UserProfile)
    private readonly userRepo: Repository<UserProfile>,
    private readonly s3Service: S3Service,
  ) {}

  async findOne(code: string) {
    const result = await this.getProfileUseCase.execute(code);
    result.avatar = toPhotoUrl(result.avatar ?? null, result.profileCode) ?? undefined;
    return result;
  }

  async findMe(userCode: string) {
    const result = await this.getMyProfileUseCase.execute(userCode);
    result.photo = toPhotoUrl(result.photo, result.profileCode);
    return result;
  }

  async updateMe(userCode: string, dto: UpdateProfileDto) {
    const result = await this.updateMyProfileUseCase.execute(userCode, dto);
    result.photo = toPhotoUrl(result.photo, result.profileCode);
    return result;
  }

  async uploadPhoto(file: Express.Multer.File, userCode: string) {
    const user = await this.userRepo.findOne({
      where: { code: userCode },
      relations: { profile: true },
    });
    if (!user) throw new NotFoundException('User not found');

    const profile = user.profile;

    const key = `profiles/${uuidv4()}`;
    await this.s3Service.putObject(key, file.buffer, file.mimetype);
    const previousPhoto = profile.photo;
    profile.photo = key;
    try {
      await this.profileRepo.save(profile);
    } catch (error) {
      await this.s3Service.deleteObject(key).catch(() => undefined);
      throw error;
    }
    if (previousPhoto && !previousPhoto.startsWith('http') && previousPhoto.includes('/')) {
      await this.s3Service.deleteObject(previousPhoto).catch(() => undefined);
    } else if (previousPhoto && !previousPhoto.startsWith('http')) {
      const legacyPath = path.join(process.cwd(), 'uploads', 'profiles', previousPhoto);
      if (existsSync(legacyPath)) {
        const { unlinkSync } = await import('fs');
        unlinkSync(legacyPath);
      }
    }

    const result = await this.getMyProfileUseCase.execute(userCode);
    result.photo = toPhotoUrl(profile.photo, profile.code);
    return result;
  }

  async getPhotoFile(code: string): Promise<{ body: Readable; mimeType: string }> {
    const profile = await this.profileRepo.findOne({ where: { code } });
    if (!profile?.photo) throw new NotFoundException('Photo not found');
    if (profile.photo.startsWith('http')) throw new NotFoundException('Photo is external');

    if (!profile.photo.includes('/')) {
      const legacyPath = path.join(process.cwd(), 'uploads', 'profiles', profile.photo);
      if (!existsSync(legacyPath)) throw new NotFoundException('Photo file not found');
      return { body: createReadStream(legacyPath), mimeType: this.getMimeType(profile.photo) };
    }
    const object = await this.s3Service.getObject(profile.photo).catch(() => {
      throw new NotFoundException('Photo file not found');
    });

    return { body: object.body, mimeType: object.contentType || this.getMimeType(profile.photo) };
  }

  private getMimeType(fileName: string): string {
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg', '.png': 'image/png', '.webp': 'image/webp', '.gif': 'image/gif',
    };
    return mimeMap[path.extname(fileName).toLowerCase()] || 'application/octet-stream';
  }

  getSettings(userCode: string) {
    return this.getSettingsUseCase.execute(userCode);
  }

  updateSettings(userCode: string, dto: UpdateSettingsDto) {
    return this.updateSettingsUseCase.execute(userCode, dto);
  }
}
