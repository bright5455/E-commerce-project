import { Injectable, ConflictException, UnauthorizedException, BadRequestException, NotFoundException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { Admin } from './entity/admin-auth.entity';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterUserDto, LoginDto, ResetPasswordDto, ChangePasswordDto } from 'src/auth/dto/auth.dto';

// TODO: This service has significant code duplication with AuthService
// Consider creating a BaseAuthService abstract class with shared logic:
// - Password hashing/comparison
// - Token generation
// - Email verification flow
// - Password reset flow
// Then have AuthService and AdminAuthService extend it

// TODO: Admin registration should be restricted - implement invite-only or first-admin-setup flow

@Injectable()
export class AdminAuthService {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private jwtService: JwtService,
  ) {}

  async register(registerDto: RegisterUserDto) {
    const existingAdmin = await this.adminRepository.findOne({ 
      where: { email: registerDto.email } 
    });

    if (existingAdmin) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const admin = this.adminRepository.create({
      ...registerDto,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
    });

    await this.adminRepository.save(admin);

    // FIXME: Remove console.log in production! Use proper logging service
    // TODO: Send verification email using MailService instead of logging token
    console.log(`Admin verification token: ${verificationToken}`);

    return {
      message: 'Admin registered successfully. Please verify your email.',
      adminId: admin.id,
    };
  }

  async login(loginDto: LoginDto) {
    const admin = await this.adminRepository.findOne({ 
      where: { email: loginDto.email } 
    });

    if (!admin) {
      throw new UnauthorizedException('credentials not found');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, admin.password);
    if (!isPasswordValid) {
      throw new UnauthorizedException('credentials not found');
    }

    if (!admin.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }


    if (admin.isTwoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return { 
          requiresTwoFactor: true,
          message: 'Please provide 2FA code' 
        };
      }

      const isValid = this.verifyCode(loginDto.twoFactorCode, admin.twoFactorSecret);

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    const payload = { sub: admin.id, email: admin.email, role: 'admin' };
    const accessToken = this.jwtService.sign(payload);

    return {
      accessToken,
      admin: {
        id: admin.id,
        email: admin.email,
        firstName: admin.firstName,
        lastName: admin.lastName,
      },
    };
  }

  async enable2FA(adminId: string) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    const secret = speakeasy.generateSecret({
      name: `ECommerce Admin (${admin.email})`,
    });

    admin.twoFactorSecret = secret.base32;
    await this.adminRepository.save(admin);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scan this QR code with Google Authenticator',
    };
  }

  async verify2FA(adminId: string, code: string) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new NotFoundException('Admin not found');
    }

    if (!admin.twoFactorSecret) {
      throw new BadRequestException('2FA is not set up for this admin. Please enable 2FA first.');
    }

    const isValid = this.verifyCode(code, admin.twoFactorSecret);

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code. Please try again.');
    }

    admin.isTwoFactorEnabled = true;
    await this.adminRepository.save(admin);

    return { message: '2FA enabled successfully. You will need to provide a code on every login.' };
  }

  private verifyCode(code: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1, 
    });
  }

  async verifyEmail(token: string) {
    const admin = await this.adminRepository.findOne({ 
      where: { emailVerificationToken: token } 
    });

    if (!admin) {
      throw new BadRequestException('Invalid verification token');
    }

    admin.isEmailVerified = true;
    admin.emailVerificationToken = null as any;
    await this.adminRepository.save(admin);

    return { message: 'Email verified successfully' };
  }

  async requestPasswordReset(email: string) {
    const admin = await this.adminRepository.findOne({ where: { email } });

    if (!admin) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    admin.resetPasswordToken = resetToken;
    admin.resetPasswordExpires = resetExpires;
    await this.adminRepository.save(admin);

    // FIXME: Remove console.log in production! Send email using MailService
    console.log(`Admin reset token: ${resetToken}`);

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const admin = await this.adminRepository.findOne({ 
      where: { resetPasswordToken: resetDto.token } 
    });

    if (!admin || (admin.resetPasswordExpires && admin.resetPasswordExpires < new Date())) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetDto.newPassword, 10);
    admin.password = hashedPassword;
    admin.resetPasswordToken = null as any;
    admin.resetPasswordExpires = null as any;
    await this.adminRepository.save(admin);

    return { message: 'Password reset successfully' };
  }

  async changePassword(adminId: string, changePasswordDto: ChangePasswordDto) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new UnauthorizedException('Admin not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      admin.password
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);
    admin.password = hashedPassword;
    await this.adminRepository.save(admin);

    return { message: 'Password changed successfully' };
  }
}