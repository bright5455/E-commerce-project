import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { WalletModule } from './wallet/wallet.module';
import { ProductModule } from './product/product.module';
import { CartModule } from './cart/cart.module';
import { OrderModule } from './order/order.module';
import { ReviewModule } from './review/review.module';
import { UserModule } from './user/user.module';
import { TransactionModule } from './transaction/transaction.module';
import { ProfileModule } from './profile/profile.module';
import { MailModule } from './mail/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { CloudinaryModule } from './cloudinary/cloudinary.module';
import * as Joi from 'joi';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      validationSchema: Joi.object({
        DB_HOST: Joi.string().required(),
        DB_PORT: Joi.number().default(5432),
        DB_USERNAME: Joi.string().required(),
        DB_PASSWORD: Joi.string().allow('').default(''),
        DB_NAME: Joi.string().required(),
        DB_SSL: Joi.string().valid('true', 'false', '1', '0').optional(),

        JWT_SECRET: Joi.string().required(),

        MAIL_HOST: Joi.string().required(),
        MAIL_PORT: Joi.number().default(2525),
        MAIL_USER: Joi.string().required(),
        MAIL_PASS: Joi.string().required(),
        MAIL_FROM: Joi.string().required(),

        FRONTEND_URL: Joi.string().uri().default('http://localhost:3000'),

        NODE_ENV: Joi.string()
          .valid('development', 'production', 'test')
          .default('development'),
      }),
      validationOptions: {
        allowUnknown: true,
        abortEarly: false,
      },
    }),

    TypeOrmModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => {
        const nodeEnv = configService.get<string>('NODE_ENV');
        const dbSsl = configService.get<string>('DB_SSL');
        // AWS RDS and most managed Postgres require SSL. Enable in production or when DB_SSL=true.
        const useSsl =
          dbSsl === 'true' || dbSsl === '1' || nodeEnv === 'production';
        const sslOptions = useSsl ? { rejectUnauthorized: false } : false;

        return {
          type: 'postgres',
          host: configService.get<string>('DB_HOST'),
          port: configService.get<number>('DB_PORT'),
          username: configService.get<string>('DB_USERNAME'),
          password: configService.get<string>('DB_PASSWORD'),
          database: configService.get<string>('DB_NAME'),
          entities: [__dirname + '/**/*.entity{.ts,.js}'],
          synchronize: false,
          migrationsRun: false,
          migrations: [__dirname + '/migrations/**/*{.ts,.js}'],
          migrationsTableName: 'migrations',
          ssl: sslOptions,
          // Pass SSL through to pg driver (required for AWS RDS)
          ...(useSsl && {
            extra: { ssl: { rejectUnauthorized: false } },
          }),
          logging: nodeEnv === 'development',
        };
      },
    }),

    PassportModule,
    JwtModule.registerAsync({
      useFactory: () => {
        if (!process.env.JWT_SECRET) {
          throw new Error('JWT_SECRET is missing! Set it in your environment variables.');
        }
        return {
          secret: process.env.JWT_SECRET,
          signOptions: { expiresIn: '7d' },
        };
      },
    }),

    AuthModule,
    WalletModule,
    ProductModule,
    CartModule,
    OrderModule,
    ReviewModule,
    UserModule,
    TransactionModule,
    ProfileModule,
    MailModule,
    CloudinaryModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}