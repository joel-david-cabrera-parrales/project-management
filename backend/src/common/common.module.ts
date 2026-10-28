import { Module } from '@nestjs/common';
import { UuidService } from './adapters/uuid/uuid.service';
import { BcryptService } from './adapters/hash-service/bcrypt.service';
import { MailerService } from './services/mailer/mailer.service';
import { HashService } from './classes/hash-service.class';
import { UuidManager } from './classes/uuid-manager.class';
import { TypeOrmModule } from '@nestjs/typeorm';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { AuthorizeWorkspaceMembershipUseCase } from './classes/authorize-workspace-membership.class';
import { AuthorizeWorkspaceMembershipUseCaseImp } from './use-cases/authorize-workspace-membership.use-case';

@Module({
  providers: [
    MailerService,
    { provide: AuthorizeWorkspaceMembershipUseCase, useClass: AuthorizeWorkspaceMembershipUseCaseImp },
    {
      provide: HashService,
      useClass: BcryptService,
    },
    {
      provide: UuidManager,
      useClass: UuidService,
    },
  ],
  imports: [TypeOrmModule.forFeature([WorkspaceMember])],
  exports: [HashService, UuidManager, MailerService, AuthorizeWorkspaceMembershipUseCase],
})
export class CommonModule {}
