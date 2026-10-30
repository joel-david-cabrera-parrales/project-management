import { Injectable, NotFoundException } from '@nestjs/common';
import { UpdateMyProfileUseCase } from '../classes/update-my-profile.class';
import { UpdateProfileDto } from '../dto/update-profile.dto';
import { MyProfileResponse } from '../interfaces/my-profile-response.interface';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { UserProfile } from 'src/auth/entities/auth.entity';
import { Profile } from '../entities/profile.entity';

@Injectable()
export class UpdateMyProfileUseCaseImp extends UpdateMyProfileUseCase {
  constructor(
    @InjectRepository(UserProfile)
    private readonly userRepo: Repository<UserProfile>,
    @InjectRepository(Profile)
    private readonly profileRepo: Repository<Profile>,
  ) {
    super();
  }

  async execute(userCode: string, dto: UpdateProfileDto): Promise<MyProfileResponse> {
    const user = await this.userRepo.findOne({
      where: { code: userCode },
      relations: { profile: true, authenticationType: true },
    });

    if (!user) throw new NotFoundException('User not found');

    const profile = user.profile;

    if (dto.firstName !== undefined) profile.firstName = dto.firstName;
    if (dto.secondName !== undefined) profile.secondName = dto.secondName;
    if (dto.firstSurname !== undefined) profile.firstSurname = dto.firstSurname;
    if (dto.secondSurname !== undefined) profile.secondSurname = dto.secondSurname;
    if (dto.phone !== undefined) profile.phone = dto.phone;

    await this.profileRepo.save(profile);

    return {
      userCode: user.code,
      profileCode: profile.code,
      authenticationType: { code: user.authenticationType.code, name: user.authenticationType.name },
      firstName: profile.firstName,
      secondName: profile.secondName ?? null,
      firstSurname: profile.firstSurname,
      secondSurname: profile.secondSurname ?? null,
      email: profile.email,
      phone: profile.phone,
      photo: profile.photo ?? null,
      dateBirth: profile.dateBirth,
      createdAt: profile.createdAt,
      fullName: `${profile.firstName} ${profile.firstSurname}`,
    };
  }
}
