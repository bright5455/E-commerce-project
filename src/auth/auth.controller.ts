import {
  Controller,
  Post,
  Body,
  Param,
  UseGuards,
  Get,
  Patch,
  Query,
  Req,
} from '@nestjs/common';
import { ApiTags, ApiOperation, ApiBearerAuth, ApiResponse } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { Request } from 'express';
import { AuthService } from './auth.service';
import {
  RegisterUserDto,
  LoginDto,
  ResetPasswordDto,
  ChangePasswordDto,
  RefreshTokenDto,
} from './dto/auth.dto';
import { JwtAuthGuard } from './guards/jwt-auth.guard';
import { RolesGuard } from './guards/roles.guard';
import { Roles } from './decorators/role.decorator';
import { User } from './decorators/user.decorator';
import { UserRole } from '../user/entity/user.entity';
import { RequestWithUser } from './interfaces/request-with-user.interface';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(private readonly authService: AuthService) {}

  @Post('user/register')
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiOperation({ summary: 'Register a new user' })
  async registerUser(@Body() registerDto: RegisterUserDto) {
    return this.authService.registerUser(registerDto);
  }

  @Post('user/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login user' })
  async loginUser(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Get('user/verify-email')
  @ApiOperation({ summary: 'Verify user email' })
  async verifyUserEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }


  @Post('user/forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request user password reset' })
  async forgotUserPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('user/reset-password')
  @ApiOperation({ summary: 'Reset user password' })
  async resetUserPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto);
  }

  @Patch('user/change-password')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change user password' })
  async changeUserPassword(
    @User('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(userId, changePasswordDto);
  }


  @Post('admin/register-first')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Register first super admin (no auth required)' })
  async registerFirstAdmin(@Body() registerDto: RegisterUserDto) {
    return this.authService.registerAdmin(registerDto);
  }

  @Post('admin/register')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Super admin invites new admin' })
  async registerAdmin(
    @Body() registerDto: RegisterUserDto,
    @User('id') superAdminId: string,
  ) {
    return this.authService.registerAdmin(registerDto, superAdminId);
  }

  @Post('admin/login')
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Login admin (works for all roles)' })
  async loginAdmin(@Body() loginDto: LoginDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.login(loginDto, ipAddress, userAgent);
  }

  @Get('admin/verify-email')
  @ApiOperation({ summary: 'Verify admin email' })
  async verifyAdminEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }


  @Post('admin/forgot-password')
  @Throttle({ default: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Request admin password reset' })
  async forgotAdminPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('admin/reset-password')
  @ApiOperation({ summary: 'Reset admin password' })
  async resetAdminPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto);
  }

  @Patch('admin/change-password')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change admin password' })
  async changeAdminPassword(
    @User('id') adminId: string,
    @Body() changePasswordDto: ChangePasswordDto,
  ) {
    return this.authService.changePassword(adminId, changePasswordDto);
  }

  @Patch('admin/role/:targetAdminId')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Update admin role (super admin only)' })
  async updateAdminRole(
    @Param('targetAdminId') targetAdminId: string,
    @Body('role') role: UserRole.ADMIN | UserRole.MODERATOR,
    @User('id') superAdminId: string,
  ) {
    return this.authService.updateAdminRole(superAdminId, targetAdminId, role);
  }

  @Post('admin/2fa/enable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Enable 2FA for admin' })
  async enable2FA(@User('id') adminId: string) {
    return this.authService.enable2FA(adminId);
  }

  @Post('admin/2fa/verify')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Verify 2FA code and activate' })
  async verify2FA(@User('id') adminId: string, @Body('code') code: string) {
    return this.authService.verify2FA(adminId, code);
  }

  @Post('admin/2fa/disable')
  @UseGuards(JwtAuthGuard, RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Disable 2FA for admin' })
  async disable2FA(@User('id') adminId: string) {
    return this.authService.disable2FA(adminId);
  }


  @Get('profile')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Get current user profile' })
  async getProfile(@Req() req: RequestWithUser) {
    return {
      user: req.user,
    };
  }

  @Post('refresh')
  @ApiOperation({ summary: 'Refresh access token' })
  @ApiResponse({ status: 200, description: 'Token refreshed successfully' })
  async refreshToken(@Body() refreshTokenDto: RefreshTokenDto, @Req() req: Request) {
    const ipAddress = req.ip || req.socket.remoteAddress || 'unknown';
    const userAgent = req.headers['user-agent'] || 'unknown';
    return this.authService.refreshAccessToken(refreshTokenDto, ipAddress, userAgent);
  }

  @Post('logout')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout and invalidate refresh token' })
  @ApiResponse({ status: 200, description: 'Logged out successfully' })
  async logout(
    @User('id') userId: string,
    @Body('refreshToken') refreshToken?: string,
  ) {
    return this.authService.logout(userId, refreshToken);
  }

  @Post('logout-all')
  @UseGuards(JwtAuthGuard)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Logout from all devices' })
  @ApiResponse({ status: 200, description: 'Logged out from all devices' })
  async logoutFromAllDevices(@User('id') userId: string) {
    return this.authService.logoutFromAllDevices(userId);
  }
}