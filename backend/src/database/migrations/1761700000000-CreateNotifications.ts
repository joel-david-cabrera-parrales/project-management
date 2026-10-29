import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateNotifications1761700000000 implements MigrationInterface {
  name = 'CreateNotifications1761700000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS auth');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth.notifications (
        id SERIAL PRIMARY KEY,
        "userId" INTEGER NOT NULL,
        type VARCHAR(40) NOT NULL,
        title VARCHAR(200) NOT NULL,
        message TEXT NOT NULL,
        data JSONB NULL,
        read BOOLEAN NOT NULL DEFAULT FALSE,
        "readAt" TIMESTAMP NULL,
        "createdAt" TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP
      )
    `);
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_notifications_user_created" ON auth.notifications ("userId", "createdAt" DESC)');
    await queryRunner.query('CREATE INDEX IF NOT EXISTS "IDX_notifications_user_read" ON auth.notifications ("userId", "read")');
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP TABLE IF EXISTS auth.notifications');
  }
}
