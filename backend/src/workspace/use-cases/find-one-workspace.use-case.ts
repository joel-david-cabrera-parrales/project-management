import { IWorkspace } from '../interfaces/workspace-response.interface';
import { FindOneWorkspaceUseCase } from '../classes/find-one-workspace.class';
import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Workspace } from '../entities/workspace.entity';
import { WorkspaceMapper } from '../mappers/workspace.mapper';
import { Attachment } from 'src/attachment/entities/attachment.entity';
import { Comment } from 'src/comment/entities/comment.entity';
import { AuthorizeWorkspaceMembershipUseCase } from 'src/common/classes/authorize-workspace-membership.class';

@Injectable()
export class FindOneWorkspaceUseCaseImp extends FindOneWorkspaceUseCase {
  constructor(
    @InjectRepository(Workspace)
    private readonly workspaceRepository: Repository<Workspace>,
    @InjectRepository(Attachment)
    private readonly attachmentRepository: Repository<Attachment>,
    @InjectRepository(Comment)
    private readonly commentRepository: Repository<Comment>,
    private readonly authorizeWorkspaceMembership: AuthorizeWorkspaceMembershipUseCase,
  ) {
    super();
  }
  async execute(workpaceCode: string, userId?: number): Promise<IWorkspace | null> {
    const workspaces = await this.workspaceRepository
      .createQueryBuilder('workspace')
      .leftJoinAndSelect('workspace.boards', 'board')
      .leftJoinAndSelect('board.taskList', 'taskList')
      .leftJoinAndSelect('taskList.tasks', 'task')
      .leftJoinAndSelect('task.labels', 'taskLabel')
      .leftJoinAndSelect('taskLabel.label', 'label')
      .leftJoinAndSelect('task.assignments', 'assignment')
      .leftJoinAndSelect('assignment.workspaceMember', 'assigneeMember')
      .leftJoinAndSelect('assigneeMember.user', 'assigneeUser')
      .leftJoinAndSelect('assigneeUser.profile', 'assigneeProfile')
      .leftJoinAndSelect('workspace.workspaceMembers', 'member', 'member.isAvailable = :memberAvailable')
      .leftJoinAndSelect('member.user', 'user')
      .leftJoinAndSelect('user.profile', 'profile')
      .where('workspace.code = :code', { code: workpaceCode })
      .andWhere('workspace.isAvailable = :isAvailable', { isAvailable: true })
      .setParameter('memberAvailable', true)
      .orderBy('taskList.position', 'ASC')
      .addOrderBy('task.position', 'ASC')
      .getMany();

    if (workspaces.length == 0) return null;

    const workspace = workspaces[0];
    if (userId !== undefined) await this.authorizeWorkspaceMembership.execute(workspace.code, userId);
    const taskIds = workspace.boards
      .flatMap((b) => b.taskList)
      .flatMap((tl) => tl.tasks)
      .filter((t) => t.isAvailable)
      .map((t) => t.id);

    if (taskIds.length > 0) {
      const attCounts = await this.attachmentRepository
        .createQueryBuilder('att')
        .select('att.taskId', 'taskId')
        .addSelect('COUNT(*)', 'count')
        .where('att.taskId IN (:...taskIds)', { taskIds })
        .andWhere('att.isAvailable = :attAvailable', { attAvailable: true })
        .groupBy('att.taskId')
        .getRawMany<{ taskId: number; count: string }>();

      const commentCounts = await this.commentRepository
        .createQueryBuilder('c')
        .select('c.taskId', 'taskId')
        .addSelect('COUNT(*)', 'count')
        .where('c.taskId IN (:...taskIds)', { taskIds })
        .andWhere('c.isAvailable = :commentAvailable', { commentAvailable: true })
        .groupBy('c.taskId')
        .getRawMany<{ taskId: number; count: string }>();

      const attMap = new Map<number, number>();
      for (const row of attCounts) {
        attMap.set(row.taskId, Number(row.count));
      }

      const commentMap = new Map<number, number>();
      for (const row of commentCounts) {
        commentMap.set(row.taskId, Number(row.count));
      }

      for (const board of workspace.boards) {
        for (const tl of board.taskList) {
          for (const task of tl.tasks) {
            (task as any).attachmentsCount = attMap.get(task.id) ?? 0;
            (task as any).commentsCount = commentMap.get(task.id) ?? 0;
          }
        }
      }
    }

    return WorkspaceMapper.toWorkspaceReponse(workspace, userId);
  }
}
