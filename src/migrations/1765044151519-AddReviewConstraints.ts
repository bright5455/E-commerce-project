import { MigrationInterface, QueryRunner } from "typeorm";

export class AddReviewConstraints1765044151519 implements MigrationInterface {
    name = 'AddReviewConstraints1765044151519'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "CHK_e87bbcfbe3ea0dda3d626010ee" CHECK ("rating" >= 1 AND "rating" <= 5)`);
        await queryRunner.query(`ALTER TABLE "reviews" ADD CONSTRAINT "UQ_9007ffba411fd471dfe233dabfb" UNIQUE ("userId", "productId")`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "UQ_9007ffba411fd471dfe233dabfb"`);
        await queryRunner.query(`ALTER TABLE "reviews" DROP CONSTRAINT "CHK_e87bbcfbe3ea0dda3d626010ee"`);
    }

}
