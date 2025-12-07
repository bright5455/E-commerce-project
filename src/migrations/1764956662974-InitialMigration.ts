import { MigrationInterface, QueryRunner } from "typeorm";

export class InitialMigration1764956662974 implements MigrationInterface {
    name = 'InitialMigration1764956662974'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a88f466d39796d3081cf96e1b66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a88f466d39796d3081cf96e1b6"`);
        await queryRunner.query(`CREATE TABLE "refresh_tokens" ("id" uuid NOT NULL DEFAULT uuid_generate_v4(), "userId" uuid NOT NULL, "token" character varying NOT NULL, "expiresAt" TIMESTAMP NOT NULL, "isRevoked" boolean NOT NULL DEFAULT false, "revokedAt" TIMESTAMP, "ipAddress" character varying, "userAgent" character varying, "createdAt" TIMESTAMP NOT NULL DEFAULT now(), CONSTRAINT "UQ_4542dd2f38a61354a040ba9fd57" UNIQUE ("token"), CONSTRAINT "PK_7d8bee0204106019488c4c50ffa" PRIMARY KEY ("id"))`);
        await queryRunner.query(`CREATE INDEX "IDX_610102b60fea1455310ccd299d" ON "refresh_tokens" ("userId") `);
        await queryRunner.query(`CREATE INDEX "IDX_4542dd2f38a61354a040ba9fd5" ON "refresh_tokens" ("token") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "userId" uuid`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "balanceBefore" numeric(10,2)`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "balanceAfter" numeric(10,2)`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_status_enum" AS ENUM('pending', 'completed', 'failed', 'cancelled')`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "status" "public"."transactions_status_enum" NOT NULL DEFAULT 'completed'`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "referenceId" uuid`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "referenceType" character varying`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "metadata" jsonb`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "ipAddress" character varying`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "userAgent" character varying`);
        await queryRunner.query(`UPDATE "transactions" SET "type" = 'payment' WHERE "type" IS NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "type"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('deposit', 'withdrawal', 'payment', 'refund', 'transfer_in', 'transfer_out', 'commission', 'bonus', 'penalty')`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "type" "public"."transactions_type_enum" NOT NULL DEFAULT 'payment'`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "description" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "refresh_tokens" ADD CONSTRAINT "FK_610102b60fea1455310ccd299de" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "refresh_tokens" DROP CONSTRAINT "FK_610102b60fea1455310ccd299de"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a88f466d39796d3081cf96e1b66"`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "description" DROP NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "type"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_type_enum"`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "type" character varying NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "userAgent"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "ipAddress"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "metadata"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "referenceType"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "referenceId"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "status"`);
        await queryRunner.query(`DROP TYPE "public"."transactions_status_enum"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "balanceAfter"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "balanceBefore"`);
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "userId"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_4542dd2f38a61354a040ba9fd5"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_610102b60fea1455310ccd299d"`);
        await queryRunner.query(`DROP TABLE "refresh_tokens"`);
        await queryRunner.query(`CREATE INDEX "IDX_a88f466d39796d3081cf96e1b6" ON "transactions" ("walletId") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}