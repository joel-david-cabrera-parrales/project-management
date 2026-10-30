import { Injectable, InternalServerErrorException, OnModuleInit } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AuthenticationType } from 'src/auth/entities/authentication-type.entity';

export const DEFAULT_AUTHENTICATION_TYPES = [
  { code: 'USER', name: 'Usuario' },
  { code: 'GOOGLE', name: 'Google' },
  { code: 'MICROSOFT', name: 'Microsoft' },
] as const;

@Injectable()
export class AuthenticationTypesService implements OnModuleInit {
  constructor(
    @InjectRepository(AuthenticationType)
    private readonly repository: Repository<AuthenticationType>,
  ) {}

  async onModuleInit(): Promise<void> {
    await this.ensureDefaults();
  }

  async ensureDefaults(): Promise<AuthenticationType[]> {
    for (const authenticationType of DEFAULT_AUTHENTICATION_TYPES) {
      await this.repository.upsert(authenticationType, ['code']);
    }

    return this.findAll();
  }

  findAll(): Promise<AuthenticationType[]> {
    return this.repository.find({ order: { id: 'ASC' } });
  }

  findByCode(code: (typeof DEFAULT_AUTHENTICATION_TYPES)[number]['code']): Promise<AuthenticationType | null> {
    return this.repository.findOneBy({ code });
  }

  async getRequiredByCode(code: (typeof DEFAULT_AUTHENTICATION_TYPES)[number]['code']): Promise<AuthenticationType> {
    const authenticationType = await this.findByCode(code);
    if (!authenticationType) {
      throw new InternalServerErrorException(`Authentication type ${code} has not been initialized`);
    }
    return authenticationType;
  }
}
