import { Injectable, UnauthorizedException, ConflictException, BadRequestException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import * as bcrypt from 'bcrypt';
import * as crypto from 'crypto';
import { RegisterUserDto, LoginDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { User } from 'src/user/entity/user.entity';
import { Wallet } from 'src/wallet/entity/wallet.entity';
import { MailService } from 'src/mail/mail.service';

// TODO: Extract common auth logic into a BaseAuthService to reduce duplication with AdminAuthService
// TODO: Add refresh token implementation for better security
// TODO: Add rate limiting for login attempts to prevent brute force attacks
// TODO: Consider using transactions when creating user + wallet to ensure data consistency

@Injectable()
export class AuthService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,

    @InjectRepository(Wallet)
    private walletRepository: Repository<Wallet>,

    private jwtService: JwtService,
    private mailService: MailService,
  ) {}

  async register(registerDto: RegisterUserDto) {
    const existingUser = await this.userRepository.findOne({
      where: { email: registerDto.email },
    });

    if (existingUser) {
      throw new ConflictException('Email already registered');
    }

    const hashedPassword = await bcrypt.hash(registerDto.password, 10);
    const verificationToken = crypto.randomBytes(32).toString('hex');

    const user = this.userRepository.create({
      ...registerDto,
      password: hashedPassword,
      emailVerificationToken: verificationToken,
    });

    await this.userRepository.save(user);

    const wallet = this.walletRepository.create({
      userId: user.id,
      balance: 0,
    });

    await this.walletRepository.save(wallet);

    try {
      await this.mailService.sendVerificationEmail(user.email, verificationToken);
    } catch (error) {
      console.error('Failed to send verification email:', error);
    }

    return {
      message: 'User registered successfully. Please check your email for your token.',
      userId: user.id,
    };
  }

  async login(loginDto: LoginDto) {
    const user = await this.userRepository.findOne({
      where: { email: loginDto.email },
    });

    if (!user) {
      // FIXME: Inconsistent error message - remove extra space and use consistent wording
      // Also consider using a generic message to prevent user enumeration attacks
      throw new UnauthorizedException('Invalid email or password');
    }

    const isPasswordValid = await bcrypt.compare(loginDto.password, user.password);

    if (!isPasswordValid) {
      // TODO: Implement login attempt tracking and account lockout after X failed attempts
      throw new UnauthorizedException('Invalid email or password');
    }

    if (!user.isEmailVerified) {
      throw new UnauthorizedException('Please verify your email first');
    }

    const payload = { sub: user.id, email: user.email, role: 'user' };
    const accessToken = this.jwtService.sign(payload, { expiresIn: '1h' });

    // TODO: Implement refresh token:
    // const refreshToken = this.jwtService.sign(payload, { expiresIn: '7d' });
    // Store refresh token in database for revocation capability

    return {
      accessToken,
      // TODO: Create a UserResponseDto and use class-transformer to serialize
      user: {
        id: user.id,
        email: user.email,
        firstName: user.firstName,
        lastName: user.lastName,
      },
    };
  }

  async verifyEmail(token: string) {
    const user = await this.userRepository.findOne({
      where: { emailVerificationToken: token },
    });

    if (!user) {
      throw new BadRequestException('Invalid verification token');
    }

    user.isEmailVerified = true;
    user.emailVerificationToken = null!;

    await this.userRepository.save(user);

    return { message: 'Email verified successfully' };
  }

  async requestPasswordReset(email: string) {
    const user = await this.userRepository.findOne({ where: { email } });

    if (!user) {
      return { message: 'If the email exists, a reset link has been sent' };
    }

    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetExpires = new Date(Date.now() + 3600000);

    user.resetPasswordToken = resetToken;
    user.resetPasswordExpires = resetExpires;

    await this.userRepository.save(user);

    try {
      await this.mailService.sendPasswordResetEmail(user.email, resetToken);
    } catch (error) {
      console.error('Failed to send password reset email:', error);
    }

    return { message: 'If the email exists, a reset link has been sent' };
  }

  async resetPassword(resetDto: ResetPasswordDto) {
    const user = await this.userRepository.findOne({
      where: { resetPasswordToken: resetDto.token },
    });

    if (!user || user.resetPasswordExpires < new Date()) {
      throw new BadRequestException('Invalid or expired reset token');
    }

    const hashedPassword = await bcrypt.hash(resetDto.newPassword, 10);

    user.password = hashedPassword;
    user.resetPasswordToken = null!;
    user.resetPasswordExpires = null!;

    await this.userRepository.save(user);

    return { message: 'Password reset successfully' };
  }

  async changePassword(userId: string, changePasswordDto: ChangePasswordDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new UnauthorizedException('User not found');
    }

    const isCurrentPasswordValid = await bcrypt.compare(
      changePasswordDto.currentPassword,
      user.password,
    );

    if (!isCurrentPasswordValid) {
      throw new UnauthorizedException('Current password is incorrect');
    }

    const hashedPassword = await bcrypt.hash(changePasswordDto.newPassword, 10);

    user.password = hashedPassword;

    await this.userRepository.save(user);

    return { message: 'Password changed successfully' };
  }
}
