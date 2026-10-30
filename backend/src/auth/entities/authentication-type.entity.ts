import { Column, Entity, OneToMany, PrimaryGeneratedColumn } from 'typeorm';
import { UserProfile } from './auth.entity';

@Entity({ schema: 'auth', name: 'authentication_types' })
export class AuthenticationType {
  @PrimaryGeneratedColumn('increment')
  id: number;

  @Column('varchar', { length: 40, unique: true })
  code: string;

  @Column('varchar', { length: 80 })
  name: string;

  @OneToMany(() => UserProfile, (credential) => credential.authenticationType)
  credentials: UserProfile[];
}
