import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateChatbotConversations1793300000000 implements MigrationInterface {
  name = 'CreateChatbotConversations1793300000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS chatbot');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS chatbot.conversations (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        "userId" INTEGER NOT NULL,
        "flowId" VARCHAR(80) NOT NULL,
        "currentState" VARCHAR(120) NOT NULL,
        "userData" JSONB NOT NULL DEFAULT '{}'::jsonb,
        history JSONB NOT NULL DEFAULT '[]'::jsonb,
        completed BOOLEAN NOT NULL DEFAULT FALSE,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_chatbot_conversation_user_updated" ON chatbot.conversations ("userId", "updatedAt" DESC)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_chatbot_conversation_flow" ON chatbot.conversations ("flowId")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS chatbot.conversations');
  }
}
