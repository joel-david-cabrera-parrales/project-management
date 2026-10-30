import {
  Column,
  CreateDateColumn,
  Entity,
  Generated,
  JoinColumn,
  ManyToOne,
  OneToMany,
  OneToOne,
  PrimaryGeneratedColumn,
  UpdateDateColumn,
} from 'typeorm';
import { Profile } from 'src/profile/entities/profile.entity';
import { WorkspaceInvitation } from 'src/workspace-invitation/entities/workspace-invitation.entity';
import { WorkspaceHistory } from 'src/workspace/entities/workspace-history.entity';
import { WorkspaceMember } from 'src/workspace/entities/workspace-member.entity';
import { Workspace } from 'src/workspace/entities/workspace.entity';
import { AuthenticationType } from './authentication-type.entity';

@Entity({ schema: 'auth' })
export class UserProfile {
  @PrimaryGeneratedColumn('increment', { name: 'userId' })
  id: number;

  @OneToOne(() => Profile, (profile) => profile.user, {
    nullable: false,
    onDelete: 'CASCADE',
    onUpdate: 'CASCADE',
  })
  @JoinColumn({ name: 'profileId' })
  profile: Profile;

  @ManyToOne(() => AuthenticationType, (authenticationType) => authenticationType.credentials, {
    nullable: false,
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'authenticationTypeId' })
  authenticationType: AuthenticationType;

  @Column('uuid', { unique: true, name: 'userCode' })
  @Generated('uuid')
  code: string;

  @Column('text', { unique: true })
  username: string;

  @Column('text')
  password: string;

  @Column('text', { nullable: true, unique: true })
  googleId?: string;

  @Column('boolean', { default: false })
  isGoogleAccount: boolean;

  @Column('text', { nullable: true, unique: true })
  microsoftId?: string;

  @Column('boolean', { default: false })
  isMicrosoftAccount: boolean;

  @Column('boolean', { default: false })
  isLoginLocked: boolean;

  @Column('timestamp', { nullable: true })
  dateLastLogin?: Date;

  @Column('text', { nullable: true })
  resetPasswordCode?: string;

  @Column('timestamp', { nullable: true })
  resetPasswordExpiresAt?: Date;

  @Column('boolean', { default: true })
  isAvailable: boolean;

  @CreateDateColumn({
    type: 'timestamp',
    default: () => 'CURRENT_TIMESTAMP',
  })
  createdAt: Date;

  @UpdateDateColumn({
    type: 'timestamp',
    nullable: true,
    default: null,
    onUpdate: 'CURRENT_TIMESTAMP',
  })
  updatedAt?: Date;

  @OneToMany(() => WorkspaceMember, (workspaceMember) => workspaceMember.user)
  workspaceMembers: WorkspaceMember[];

  @OneToMany(() => Workspace, (workspace) => workspace.user)
  workspaces: Workspace[];

  @OneToMany(() => WorkspaceHistory, (history) => history.user)
  workspacesHistories: WorkspaceHistory[];

  @OneToMany(() => WorkspaceInvitation, (invitation) => invitation.user)
  workspaceInvitations: WorkspaceInvitation[];
}
