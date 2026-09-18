// Production migration datasource.
//
// typeorm.config.ts (repo root) is used for local development via
// `typeorm-ts-node-commonjs`, which needs ts-node at runtime. ts-node is a
// devDependency, so it is not guaranteed to be installed in a production
// environment (a `npm install` run with NODE_ENV=production skips
// devDependencies). Running migrations in production must not depend on that.
//
// This file targets the *compiled* output instead - the same dist/src/**/*.js
// entities and migrations that main.js itself loads at runtime (see the
// TypeOrmModule.forRootAsync entities glob in app.module.ts) - so it only
// needs the plain `typeorm` CLI (a normal dependency), no ts-node.
//
// Usage (after `npm run build`): npm run migration:run:prod
import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config();

const useSsl =
  process.env.DB_SSL === 'true' ||
  process.env.DB_SSL === '1' ||
  process.env.NODE_ENV === 'production';

export default new DataSource({
  type: 'postgres',
  host: process.env.DB_HOST,
  port: parseInt(process.env.DB_PORT || '5432', 10),
  username: process.env.DB_USERNAME,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  schema: 'public',
  entities: [__dirname + '/../**/*.entity.js'],
  migrations: [__dirname + '/../migrations/*.js'],
  synchronize: false,
  ssl: useSsl ? { rejectUnauthorized: false } : false,
});
