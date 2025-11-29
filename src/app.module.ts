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
import { AdminAuthModule } from './admin-auth/admin-auth.module';
import { TransactionModule } from './transaction/transaction.module';
import { ProfileModule } from './profile/profile.module';
import { MailModule } from './mail/mail.module';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import * as Joi from 'joi';
import { User } from 'src/user/entity/user.entity';
import { Transaction } from 'src/transaction/entity/transaction.entity';
import { Admin } from 'src/admin-auth/entity/admin-auth.entity';
import { Wallet } from 'src/wallet/entity/wallet.entity';
import { Product } from 'src/product/entity/product.entity';
import { Review } from 'src/review/entity/review.entity';
import { Order } from 'src/order/entity/order.entity';
import { Cart } from 'src/cart/entity/cart.entity';

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


    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || '',
      database: process.env.DB_NAME || 'ecommerce',
      entities: [User, Admin, Product, Cart, Order, Review, Wallet, Transaction],
      // FIXME: CRITICAL - Set synchronize to false in production!
      // This can cause data loss. Use migrations instead:
      // synchronize: process.env.NODE_ENV !== 'production',
      // Also add: migrationsRun: true, migrations: ['dist/migrations/*.js']
      synchronize: process.env.NODE_ENV !== 'production',
      logging: process.env.NODE_ENV === 'development',
    }),

    PassportModule,

    JwtModule.register({
      // FIXME: CRITICAL - Never use fallback secrets! App should fail if JWT_SECRET is not set.
      // Remove the fallback: secret: process.env.JWT_SECRET,
      // Or use ConfigService with validation to ensure it exists
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    // FIXME: MailModule is imported twice (also at line 40). Remove this duplicate.


    AuthModule,
    WalletModule,
    ProductModule,
    CartModule,
    OrderModule,
    ReviewModule,
    UserModule,
    AdminAuthModule,
    TransactionModule,
    ProfileModule,
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}