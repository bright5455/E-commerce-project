import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entity/admin-auth.entity'; 
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminJwtStrategy } from 'src/auth/strategies/admin-jwt.strategy'; 
import { MailModule } from 'src/mail/mail.module';

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]), 
    PassportModule,
    JwtModule.register({
      secret: process.env.JWT_SECRET || 'your-secret-key',
      signOptions: { expiresIn: '7d' },
    }),
    MailModule, 
  ],
  controllers: [AdminAuthController],
  providers: [
    AdminAuthService,
    AdminJwtStrategy, 
  ],
  exports: [AdminAuthService],
})
export class AdminAuthModule {}