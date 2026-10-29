import { BadRequestException } from '@nestjs/common';
import { TaskLabel } from './task-label.entity';
import { TaskAssignment } from './task-assignment.entity';
import { TaskList } from '../../task-list/entities/task-list.entity';
import { Attachment } from 'src/attachment/entities/attachment.entity';
import {
  BeforeInsert,
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';

@Entity({ schema: 'workspaces' })
export class Task {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column({ type: 'uuid', unique: true, name: 'taskCode' })
  @Generated('uuid')
  code: string;

  @Column({ type: 'varchar', length: 250, nullable: false })
  title: string;

  @Column({ type: 'text', nullable: true })
  description: string;

  @Column({ type: 'date', nullable: true })
  dateInit: Date;

  @Column({ type: 'date', nullable: true })
  dateEnd: Date;

  @Column({ type: 'integer', nullable: false, default: 1 })
  position: number;

  @Column({ type: 'boolean', nullable: false, default: false })
  completed: boolean;

  @Column({ type: 'boolean', default: true })
  isAvailable: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;

  @ManyToOne(() => TaskList, (taskList) => taskList.tasks, { nullable: false })
  @JoinColumn({ name: 'taskListId' })
  taskList: TaskList;

  @OneToMany(() => TaskLabel, (label) => label.task, { cascade: true })
  labels: TaskLabel[];

  @OneToMany(() => TaskAssignment, (assignment) => assignment.task, { cascade: true })
  assignments: TaskAssignment[];

  @OneToMany(() => Attachment, (attachment) => attachment.task)
  attachments: Attachment[];

  @BeforeInsert()
  checkDatesInitEnd() {
    if (this.dateEnd && this.dateInit && this.dateEnd < this.dateInit) {
      throw new BadRequestException('La fecha de fin debe ser mayor a la fecha de inicio');
    }
  }
}
