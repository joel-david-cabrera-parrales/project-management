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
import * as path from 'path';
import * as fs from 'fs';

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

    const ext = path.extname(file.originalname);
    const storedName = `${uuidv4()}${ext}`;
    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    if (!fs.existsSync(uploadDir)) {
      fs.mkdirSync(uploadDir, { recursive: true });
    }

    if (profile.photo && !profile.photo.startsWith('http')) {
      const oldPath = path.join(uploadDir, profile.photo);
      if (fs.existsSync(oldPath)) {
        fs.unlinkSync(oldPath);
      }
    }

    const filePath = path.join(uploadDir, storedName);
    fs.writeFileSync(filePath, file.buffer);

    profile.photo = storedName;
    await this.profileRepo.save(profile);

    const result = await this.getMyProfileUseCase.execute(userCode);
    result.photo = toPhotoUrl(profile.photo, profile.code);
    return result;
  }

  async getPhotoFile(code: string): Promise<{ filePath: string; mimeType: string }> {
    const profile = await this.profileRepo.findOne({ where: { code } });
    if (!profile?.photo) throw new NotFoundException('Photo not found');
    if (profile.photo.startsWith('http')) throw new NotFoundException('Photo is external');

    const uploadDir = path.join(process.cwd(), 'uploads', 'profiles');
    const filePath = path.join(uploadDir, profile.photo);

    if (!fs.existsSync(filePath)) throw new NotFoundException('Photo file not found');

    const ext = path.extname(profile.photo).toLowerCase();
    const mimeMap: Record<string, string> = {
      '.jpg': 'image/jpeg',
      '.jpeg': 'image/jpeg',
      '.png': 'image/png',
      '.webp': 'image/webp',
      '.gif': 'image/gif',
    };
    const mimeType = mimeMap[ext] ?? 'application/octet-stream';

    return { filePath, mimeType };
  }

  getSettings(userCode: string) {
    return this.getSettingsUseCase.execute(userCode);
  }

  updateSettings(userCode: string, dto: UpdateSettingsDto) {
    return this.updateSettingsUseCase.execute(userCode, dto);
  }
}
