import { MigrationInterface, QueryRunner } from "typeorm";

export class AddCloudinaryPublicIdToUser1765045630716 implements MigrationInterface {
    name = 'AddCloudinaryPublicIdToUser1765045630716'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" ADD "cloudinaryPublicId" character varying`);
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "users" DROP COLUMN "cloudinaryPublicId"`);
    }

}
