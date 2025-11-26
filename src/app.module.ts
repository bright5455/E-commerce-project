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
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { ConfigModule } from '@nestjs/config';
import { User } from 'src/user/entity/user.entity';
import { Transaction } from 'src/transaction/entity/transaction.entity';
import { Admin } from 'src/admin-auth/entity/admin-auth.entity';
import { Wallet } from 'src/wallet/entity/wallet.entity';
import { Product } from 'src/product/entity/product.entity';
import { Review } from 'src/review/entity/review.entity';
import { Order } from 'src/order/entity/order.entity';
import { Cart } from 'src/cart/entity/cart.entity';
import { MailModule } from './mail/mail.module';

// TODO: Add ConfigModule validation schema to enforce required environment variables
// Example:
// import * as Joi from 'joi';
// ConfigModule.forRoot({
//   validationSchema: Joi.object({
//     DB_HOST: Joi.string().required(),
//     DB_PORT: Joi.number().default(5432),
//     JWT_SECRET: Joi.string().required(),
//     // ... other required env vars
//   }),
// })


  @Module({
  imports: [AuthModule,
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
    ConfigModule.forRoot({ isGlobal: true }),
    TypeOrmModule.forRoot({
      type: 'postgres',
      host: process.env.DB_HOST || 'localhost',
      port: parseInt(process.env.DB_PORT ?? '5432', 10),
      username: process.env.DB_USERNAME || 'postgres',
      password: process.env.DB_PASSWORD || 'postgres',
      database: process.env.DB_NAME || 'ecommerce',
      entities: [User, Admin, Product, Cart, Order, Review, Wallet, Transaction],
      // FIXME: CRITICAL - Set synchronize to false in production!
      // This can cause data loss. Use migrations instead:
      // synchronize: process.env.NODE_ENV !== 'production',
      // Also add: migrationsRun: true, migrations: ['dist/migrations/*.js']
      synchronize: true, 
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
    MailModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}