import { Module } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { AdminAuthController } from './admin-auth.controller';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Admin } from './entity/admin-auth.entity'; 
import { JwtModule } from '@nestjs/jwt';
import { PassportModule } from '@nestjs/passport';
import { AdminJwtStrategy } from 'src/auth/strategies/admin-jwt.strategy'; 
import { MailModule } from 'src/mail/mail.module';

// TODO: Consider restricting admin registration - only allow existing admins to create new admins
// TODO: Add role-based permissions (super_admin, admin, moderator)

@Module({
  imports: [
    TypeOrmModule.forFeature([Admin]), 
    PassportModule,
    JwtModule.register({
      // FIXME: CRITICAL - Remove fallback secret! Use ConfigService with validation
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