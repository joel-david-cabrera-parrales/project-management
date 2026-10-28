import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Task } from '../entities/task.entity';
import { TaskAssignment } from '../entities/task-assignment.entity';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { AssignMemberDto } from '../dto/assign-member.dto';
import { AssignMemberUseCase } from '../classes/assign-member.class';

@Injectable()
export class AssignMemberUseCaseImp implements AssignMemberUseCase {
  constructor(
    @InjectRepository(Task)
    private readonly taskRepository: Repository<Task>,
    @InjectRepository(TaskAssignment)
    private readonly assignmentRepository: Repository<TaskAssignment>,
    @InjectRepository(WorkspaceMember)
    private readonly workspaceMemberRepository: Repository<WorkspaceMember>,
  ) {}

  async execute(taskId: number, dto: AssignMemberDto): Promise<TaskAssignment> {
    const task = await this.taskRepository.findOne({
      where: { id: taskId, isAvailable: true },
      relations: { taskList: { board: { workspace: true } } },
    });
    if (!task) throw new NotFoundException('Task not found');

    const workspaceMember = await this.workspaceMemberRepository.findOne({
      where: {
        id: dto.workspaceMemberId,
        isAvailable: true,
        workspace: { id: task.taskList.board.workspace.id, isAvailable: true },
      },
    });
    if (!workspaceMember) throw new NotFoundException('Workspace member not found');

    const assignment = this.assignmentRepository.create({ task, workspaceMember });
    return this.assignmentRepository.save(assignment);
  }
}
