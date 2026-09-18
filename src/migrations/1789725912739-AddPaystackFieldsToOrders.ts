import { MigrationInterface, QueryRunner } from "typeorm";

export class AddPaystackFieldsToOrders1789725912739 implements MigrationInterface {
    name = 'AddPaystackFieldsToOrders1789725912739'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "orders" ADD "paymentReference" character varying`);
        await queryRunner.query(`ALTER TABLE "orders" ADD "gatewayResponse" jsonb`);
        await queryRunner.query(`CREATE INDEX "IDX_orders_paymentReference" ON "orders" ("paymentReference")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX "public"."IDX_orders_paymentReference"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "gatewayResponse"`);
        await queryRunner.query(`ALTER TABLE "orders" DROP COLUMN "paymentReference"`);
    }

}
