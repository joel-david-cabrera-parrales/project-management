import { CreateDateColumn, Column, Entity, Index, PrimaryGeneratedColumn, UpdateDateColumn } from 'typeorm';
import type { ChatbotMessage } from '../interfaces/chatbot-conversation.interface';
import type { ChatbotUserData } from '../interfaces/chatbot-flow.interface';

@Entity({ schema: 'chatbot', name: 'conversations' })
@Index('IDX_chatbot_conversation_user_updated', ['userId', 'updatedAt'])
@Index('IDX_chatbot_conversation_flow', ['flowId'])
export class ChatbotConversation {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column({ type: 'integer' })
  userId: number;

  @Column({ type: 'varchar', length: 80 })
  flowId: string;

  @Column({ type: 'varchar', length: 120 })
  currentState: string;

  @Column({ type: 'jsonb', default: () => "'{}'::jsonb" })
  userData: ChatbotUserData;

  @Column({ type: 'jsonb', default: () => "'[]'::jsonb" })
  history: ChatbotMessage[];

  @Column({ type: 'boolean', default: false })
  completed: boolean;

  @CreateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP' })
  createdAt: Date;

  @UpdateDateColumn({ type: 'timestamp', default: () => 'CURRENT_TIMESTAMP', onUpdate: 'CURRENT_TIMESTAMP' })
  updatedAt: Date;
}
