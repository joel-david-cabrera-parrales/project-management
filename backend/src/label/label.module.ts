import { forwardRef, Module } from '@nestjs/common';
import { AuthModule } from 'src/auth/auth.module';
import { LabelService } from './label.service';
import { LabelController } from './label.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Label } from './entities/label.entity';
import { WorkspaceModule } from 'src/workspace/workspace.module';
import { CreateLabelUseCase } from './classes/create-label.class';
import { CreateLabelUseCaseImp } from './use-cases/create-label.use-case';
import { FindLabelsByWorkspaceUseCase } from './classes/find-labels-by-workspace.class';
import { FindLabelsByWorkspaceUseCaseImp } from './use-cases/find-labels-by-workspace.use-case';
import { UpdateLabelUseCase } from './classes/update-label.class';
import { UpdateLabelUseCaseImp } from './use-cases/update-label.use-case';
import { DeleteLabelUseCase } from './classes/delete-label.class';
import { DeleteLabelUseCaseImp } from './use-cases/delete-label.use-case';
import { CommonModule } from 'src/common/common.module';

@Module({
  controllers: [LabelController],
  providers: [
    LabelService,
    { provide: CreateLabelUseCase, useClass: CreateLabelUseCaseImp },
    { provide: FindLabelsByWorkspaceUseCase, useClass: FindLabelsByWorkspaceUseCaseImp },
    { provide: UpdateLabelUseCase, useClass: UpdateLabelUseCaseImp },
    { provide: DeleteLabelUseCase, useClass: DeleteLabelUseCaseImp },
  ],
  imports: [TypeOrmModule.forFeature([Label]), forwardRef(() => WorkspaceModule), AuthModule, CommonModule],
  exports: [TypeOrmModule, LabelService],
})
export class LabelModule {}
