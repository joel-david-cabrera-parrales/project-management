import { MigrationInterface, QueryRunner } from 'typeorm';

export class CreateAuthenticationTypes1800000000000 implements MigrationInterface {
  name = 'CreateAuthenticationTypes1800000000000';

  async up(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('CREATE SCHEMA IF NOT EXISTS auth');
    await queryRunner.query(`
      CREATE TABLE IF NOT EXISTS auth.authentication_types (
        id SERIAL PRIMARY KEY,
        code VARCHAR(40) NOT NULL UNIQUE,
        name VARCHAR(80) NOT NULL
      )
    `);
    await queryRunner.query(`
      INSERT INTO auth.authentication_types (code, name)
      VALUES ('USER', 'Usuario'), ('GOOGLE', 'Google'), ('MICROSOFT', 'Microsoft')
      ON CONFLICT (code) DO NOTHING
    `);
    await queryRunner.query('ALTER TABLE auth."user_profile" ADD COLUMN IF NOT EXISTS "authenticationTypeId" INTEGER');
    await queryRunner.query(`
      UPDATE auth."user_profile"
      SET "authenticationTypeId" = CASE
        WHEN "isGoogleAccount" = TRUE THEN (SELECT id FROM auth.authentication_types WHERE code = 'GOOGLE')
        WHEN "isMicrosoftAccount" = TRUE THEN (SELECT id FROM auth.authentication_types WHERE code = 'MICROSOFT')
        ELSE (SELECT id FROM auth.authentication_types WHERE code = 'USER')
      END
      WHERE "authenticationTypeId" IS NULL
    `);
    await queryRunner.query('ALTER TABLE auth."user_profile" ALTER COLUMN "authenticationTypeId" SET NOT NULL');
    await queryRunner.query(`
      DO $$ BEGIN
        ALTER TABLE auth."user_profile"
          ADD CONSTRAINT "FK_user_profile_authentication_type"
          FOREIGN KEY ("authenticationTypeId") REFERENCES auth.authentication_types(id) ON DELETE RESTRICT;
      EXCEPTION WHEN duplicate_object THEN NULL;
      END $$
    `);
    await queryRunner.query(
      'CREATE INDEX IF NOT EXISTS "IDX_user_profile_authentication_type" ON auth."user_profile" ("authenticationTypeId")',
    );
  }

  async down(queryRunner: QueryRunner): Promise<void> {
    await queryRunner.query('DROP INDEX IF EXISTS auth."IDX_user_profile_authentication_type"');
    await queryRunner.query(
      'ALTER TABLE auth."user_profile" DROP CONSTRAINT IF EXISTS "FK_user_profile_authentication_type"',
    );
    await queryRunner.query('ALTER TABLE auth."user_profile" DROP COLUMN IF EXISTS "authenticationTypeId"');
    await queryRunner.query('DROP TABLE IF EXISTS auth.authentication_types');
  }
}
