import { 
  Injectable, 
  UnauthorizedException, 
  ConflictException, 
  BadRequestException,
  NotFoundException,
  ForbiddenException,
  Logger
} from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, DataSource } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import * as speakeasy from 'speakeasy';
import * as QRCode from 'qrcode';
import { RegisterUserDto, LoginDto, ResetPasswordDto, ChangePasswordDto, RefreshTokenDto } from './dto/auth.dto';
import { User, UserRole } from '../user/entity/user.entity';
import { Wallet } from '../wallet/entity/wallet.entity';
import { MailService } from '../mail/mail.service';
import { RefreshToken } from '../user/entity/refresh-token.entity';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,
    @InjectRepository(RefreshToken)
    private refreshTokenRepository: Repository<RefreshToken>,
    private jwtService: JwtService,
    private mailService: MailService,
    private dataSource: DataSource,
  ) {}

  private async hashPassword(password: string): Promise<string> {
    return bcrypt.hash(password, 10);
  }

  private async comparePasswords(plain: string, hashed: string): Promise<boolean> {
    return bcrypt.compare(plain, hashed);
  }

  private generateToken(): string {
    return crypto.randomBytes(32).toString('hex');
  }

  private generateAccessToken(payload: { sub: string; email: string; role: UserRole }): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  private generateRefreshToken(payload: { sub: string; email: string; role: UserRole }): string {
    return this.jwtService.sign(payload, { expiresIn: '7d' });
  }

  private async generateAndSaveRefreshToken(
    userId: string,
    email: string,
    role: UserRole,
    ipAddress?: string,
    userAgent?: string,
  ): Promise<string> {
    const token = this.generateRefreshToken({ sub: userId, email, role });
    const refreshToken = this.refreshTokenRepository.create({
      userId,
      token,
      ipAddress,
      userAgent,
      expiresAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), 
    });
    await this.refreshTokenRepository.save(refreshToken);
    return token;
  }

  private verify2FACode(code: string, secret: string): boolean {
    return speakeasy.totp.verify({
      secret,
      encoding: 'base32',
      token: code,
      window: 1,
    });
  }

  async registerUser(registerDto: RegisterUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await this.hashPassword(registerDto.password);
      const verificationToken = this.generateToken();

      const user = this.userRepository.create({
        ...registerDto,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        role: UserRole.USER,
      });

      await queryRunner.manager.save(user);

      const wallet = this.walletRepository.create({
        userId: user.id,
        balance: 0,
      });

      await queryRunner.manager.save(wallet);
      await queryRunner.commitTransaction();

      try {
        await this.mailService.sendVerificationEmail(user.email, verificationToken);
        this.logger.log(`Verification email sent to ${user.email}`);
      } catch (error) {
        this.logger.error('Failed to send verification email:', error);
      }

      return {
        message: 'User registered successfully. Please check your email for verification.',
        userId: user.id,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }


  async registerAdmin(registerDto: RegisterUserDto, invitedByAdminId?: string) {
    const adminCount = await this.userRepository.count({
      where: [
        { role: UserRole.SUPER_ADMIN },
        { role: UserRole.ADMIN },
        { role: UserRole.MODERATOR },
      ],
    });
    
    if (adminCount > 0 && !invitedByAdminId) {
      throw new ForbiddenException('Admin registration requires invitation from existing super admin');
    }

    if (invitedByAdminId) {
      const invitingAdmin = await this.userRepository.findOne({ 
        where: { id: invitedByAdminId } 
      });

      if (!invitingAdmin) {
        throw new NotFoundException('Inviting admin not found');
      }

      if (invitingAdmin.role !== UserRole.SUPER_ADMIN) {
        throw new ForbiddenException('Only super admins can create new admins');
      }
    }

    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const queryRunner = this.dataSource.createQueryRunner();
    await queryRunner.connect();
    await queryRunner.startTransaction();

    try {
      const hashedPassword = await this.hashPassword(registerDto.password);
      const verificationToken = this.generateToken();
      const role = adminCount === 0 ? UserRole.SUPER_ADMIN : UserRole.ADMIN;

      const admin = this.userRepository.create({
        ...registerDto,
        password: hashedPassword,
        emailVerificationToken: verificationToken,
        role,
      });

      await queryRunner.manager.save(admin);
      await queryRunner.commitTransaction();

      try {
        await this.mailService.sendVerificationEmail(admin.email, verificationToken);
        this.logger.log(`Admin verification email sent to ${admin.email}`);
      } catch (error) {
        this.logger.error('Failed to send admin verification email:', error);
      }

      return {
        message: 'Admin registered successfully. Please check your email for verification.',
        adminId: admin.id,
        role: admin.role,
      };
    } catch (error) {
      await queryRunner.rollbackTransaction();
      throw error;
    } finally {
      await queryRunner.release();
    }
  }


  async login(loginDto: LoginDto, ipAddress?: string, userAgent?: string) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await this.comparePasswords(loginDto.password, user.password);

    if (!isPasswordValid) {
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }


    if (user.isAdmin() && user.isTwoFactorEnabled) {
      if (!loginDto.twoFactorCode) {
        return {
          requiresTwoFactor: true,
          message: 'Please provide 2FA code',
        };
      }

      if (!user.twoFactorSecret) {
        throw new UnauthorizedException('2FA is not set up for this account');
      }

      const isValid = this.verify2FACode(loginDto.twoFactorCode, user.twoFactorSecret);

      if (!isValid) {
        throw new UnauthorizedException('Invalid 2FA code');
      }
    }

    const payload = { sub: user.id, email: user.email, role: user.role };
    const accessToken = this.generateAccessToken(payload);
    const refreshToken = await this.generateAndSaveRefreshToken(
      user.id,
      user.email,
      user.role,
      ipAddress,
      userAgent,
    );

    this.logger.log(`User logged in: ${user.email} (${user.role})`);

    return {
      accessToken,
      refreshToken,
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
        role: user.role,
      },
    };
  }


  async logout(userId: string, refreshToken?: string) {
    if (refreshToken) {
      const token = await this.refreshTokenRepository.findOne({
        where: { token: refreshToken, userId },
      });

      if (token && !token.isRevoked) {
        token.isRevoked = true;
        token.revokedAt = new Date();
        await this.refreshTokenRepository.save(token);
      }
    } else {
      await this.refreshTokenRepository.update(
        { userId, isRevoked: false },
        { isRevoked: true, revokedAt: new Date() },
      );
    }

    this.logger.log(`User logged out: ${userId}`);

    return { message: 'Logged out successfully' };
  }

  async logoutFromAllDevices(userId: string) {
    await this.refreshTokenRepository.update(
      { userId, isRevoked: false },
      { isRevoked: true, revokedAt: new Date() },
    );

    this.logger.log(`User logged out from all devices: ${userId}`);

    return { message: 'Logged out from all devices successfully' };
  }


  async refreshAccessToken(refreshTokenDto: RefreshTokenDto, ipAddress?: string, userAgent?: string) {
    const { refreshToken: token } = refreshTokenDto;

    const refreshToken = await this.refreshTokenRepository.findOne({
      where: { token },
      relations: ['user'],
    });

    this.logger.debug(`Refresh token lookup: ${refreshToken ? 'Found' : 'Not found'}`);

    if (!refreshToken) {
      this.logger.warn('Invalid refresh token attempted');
      throw new UnauthorizedException('Invalid refresh token');
    }

    if (!refreshToken.isValid()) {
      this.logger.warn(`Expired or revoked token: ${refreshToken.id}`);
      throw new UnauthorizedException('Refresh token expired or revoked');
    }

    try {
      const payload = this.jwtService.verify(token);

      const newAccessToken = this.generateAccessToken({
        sub: payload.sub,
        email: payload.email,
        role: payload.role,
      });

      const newRefreshToken = await this.generateAndSaveRefreshToken(
        payload.sub,
        payload.email,
        payload.role,
        ipAddress,
        userAgent,
      );

      refreshToken.isRevoked = true;
      refreshToken.revokedAt = new Date();
      await this.refreshTokenRepository.save(refreshToken);

      this.logger.log(`Access token refreshed for user: ${payload.email}`);

      return {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      };
    } catch (error) {
      this.logger.error('Invalid refresh token - JWT verification failed', error);
      throw new UnauthorizedException('Invalid refresh token');
    }
  }

  async cleanupExpiredTokens() {
    const result = await this.refreshTokenRepository
      .createQueryBuilder()
      .delete()
      .where('expiresAt < :now', { now: new Date() })
      .execute();

    this.logger.log(`Cleaned up ${result.affected} expired refresh tokens`);
    return result;
  }


  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = '';
    await this.userRepository.save(user);

    this.logger.log(`Email verified: ${user.email} (${user.role})`);

    return { message: 'Email verified successfully' };
  }


  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = this.generateToken();
    const resetExpires = new Date(Date.now() + 3600000); 

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;
    await this.userRepository.save(user);

    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetToken);
      this.logger.log(`Password reset email sent to ${user.email}`);
    } catch (error) {
      this.logger.error('Failed to send password reset email:', error);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: resetDto.token },
    });

    if (!user || (user.resetPasswordExpires && user.resetPasswordExpires < new Date())) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await this.hashPassword(resetDto.newPassword);
    user.password = hashedPassword;
    user.resetPasswordToken = '';
    user.resetPasswordExpires = new Date(0);
    await this.userRepository.save(user);

    this.logger.log(`Password reset: ${user.email}`);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await this.comparePasswords(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    if (changePasswordDto.currentPassword === changePasswordDto.newPassword) {
      throw new BadRequestException('New password must be different from current password');
    }

    const hashedPassword = await this.hashPassword(changePasswordDto.newPassword);
    user.password = hashedPassword;
    await this.userRepository.save(user);

    this.logger.log(`Password changed: ${user.email}`);

    return { message: 'Password changed successfully' };
  }



  async updateAdminRole(
    superAdminId: string, 
    targetAdminId: string, 
    newRole: UserRole.ADMIN | UserRole.MODERATOR
  ) {
    const superAdmin = await this.userRepository.findOne({ 
      where: { id: superAdminId } 
    });

    if (!superAdmin || superAdmin.role !== UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Only super admins can change roles');
    }

    const targetAdmin = await this.userRepository.findOne({ 
      where: { id: targetAdminId } 
    });

    if (!targetAdmin) {
      throw new NotFoundException('Admin not found');
    }

    if (targetAdmin.role === UserRole.SUPER_ADMIN) {
      throw new ForbiddenException('Cannot change super admin role');
    }

    if (targetAdmin.role === UserRole.USER) {
      throw new BadRequestException('Cannot change regular user role via admin endpoint');
    }

    targetAdmin.role = newRole;
    await this.userRepository.save(targetAdmin);

    this.logger.log(`Admin role updated: ${targetAdmin.email} -> ${newRole}`);

    return {
      message: 'Admin role updated successfully',
      admin: {
        id: targetAdmin.id,
        email: targetAdmin.email,
        role: targetAdmin.role,
      },
    };
  }


  async enable2FA(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.isAdmin()) {
      throw new ForbiddenException('2FA is only available for admin accounts');
    }

    const secret = speakeasy.generateSecret({
      name: `ECommerce Admin (${user.email})`,
    });

    user.twoFactorSecret = secret.base32;
    await this.userRepository.save(user);

    const qrCodeUrl = await QRCode.toDataURL(secret.otpauth_url!);

    this.logger.log(`2FA enabled for admin: ${user.email}`);

    return {
      secret: secret.base32,
      qrCode: qrCodeUrl,
      message: 'Scan this QR code with Google Authenticator or Authy',
    };
  }

  async verify2FA(userId: string, code: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    if (!user.twoFactorSecret) {
      throw new BadRequestException('2FA is not set up. Please enable 2FA first.');
    }

    const isValid = this.verify2FACode(code, user.twoFactorSecret);

    if (!isValid) {
      throw new BadRequestException('Invalid 2FA code');
    }

    user.isTwoFactorEnabled = true;
    await this.userRepository.save(user);

    this.logger.log(`2FA verified for admin: ${user.email}`);

    return { message: '2FA enabled successfully' };
  }

  async disable2FA(userId: string) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    user.isTwoFactorEnabled = false;
    user.twoFactorSecret = null;
    await this.userRepository.save(user);

    this.logger.log(`2FA disabled for admin: ${user.email}`);

    return { message: '2FA disabled successfully' };
  }
}