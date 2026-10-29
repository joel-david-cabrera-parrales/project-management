import { TaskList } from 'src/task-list/entities/task-list.entity';
import {
  Entity,
  PrimaryGeneratedColumn,
  Column,
  Generated,
  ManyToOne,
  JoinColumn,
  CreateDateColumn,
  UpdateDateColumn,
  OneToMany,
} from 'typeorm';
import { Workspace } from './workspace.entity';

@Entity({ schema: 'workspaces' })
export class Board {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'uuid', name: 'boardCode', unique: true })
  @Generated('uuid')
  code: string;

  @ManyToOne(() => Workspace, (workspace) => workspace.boards, { nullable: false, eager: true })
  @JoinColumn({ name: 'workspaceId' })
  workspace: Workspace;

  @Column({ type: 'varchar', length: 150, nullable: true })
  title?: string | null;

  @Column({ type: 'boolean', default: false })
  starred: boolean;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    name: 'boardCreatedAt',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;

  @OneToMany(() => TaskList, (list) => list.board)
  taskList: TaskList[];
}
