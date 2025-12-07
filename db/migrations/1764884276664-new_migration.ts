import { MigrationInterface, QueryRunner } from "typeorm";

export class NewMigration1764884276664 implements MigrationInterface {
    name = 'NewMigration1764884276664'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "transactions" DROP CONSTRAINT "FK_a88f466d39796d3081cf96e1b66"`);
        await queryRunner.query(`DROP INDEX "public"."IDX_a88f466d39796d3081cf96e1b6"`);
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
        await queryRunner.query(`ALTER TABLE "transactions" DROP COLUMN "type"`);
        await queryRunner.query(`CREATE TYPE "public"."transactions_type_enum" AS ENUM('deposit', 'withdrawal', 'payment', 'refund', 'transfer_in', 'transfer_out', 'commission', 'bonus', 'penalty')`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD "type" "public"."transactions_type_enum" NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" ALTER COLUMN "description" SET NOT NULL`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_6bb58f2b6e30cb51a6504599f41" FOREIGN KEY ("userId") REFERENCES "users"("id") ON DELETE NO ACTION ON UPDATE NO ACTION`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
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
        await queryRunner.query(`CREATE INDEX "IDX_a88f466d39796d3081cf96e1b6" ON "transactions" ("walletId") `);
        await queryRunner.query(`ALTER TABLE "transactions" ADD CONSTRAINT "FK_a88f466d39796d3081cf96e1b66" FOREIGN KEY ("walletId") REFERENCES "wallets"("id") ON DELETE CASCADE ON UPDATE NO ACTION`);
    }

}
