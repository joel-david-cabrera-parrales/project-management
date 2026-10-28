import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { TaskAssignment } from '../entities/task-assignment.entity';
import { UnassignMemberUseCase } from '../classes/unassign-member.class';

@Injectable()
export class UnassignMemberUseCaseImp implements UnassignMemberUseCase {
  constructor(
    @InjectRepository(TaskAssignment)
    private readonly assignmentRepository: Repository<TaskAssignment>,
  ) {}

  async execute(assignmentId: number, taskId: number): Promise<void> {
    const assignment = await this.assignmentRepository.findOneBy({ id: assignmentId, task: { id: taskId } });
    if (!assignment) throw new NotFoundException('Assignment not found');
    await this.assignmentRepository.remove(assignment);
  }
}
