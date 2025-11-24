import { Controller } from '@nestjs/common';
import { AdminJwtAuthGuard } from 'src/auth/guards/admin-jwt-auth.guards';
import { Post, Body, Get, Query, Patch, UseGuards, Request } from '@nestjs/common';
import { AdminAuthService } from './admin-auth.service';
import { RegisterUserDto, LoginDto, ResetPasswordDto, ChangePasswordDto } from 'src/auth/dto/auth.dto';
@Controller('admin/auth')
export class AdminAuthController {
  constructor(private adminAuthService: AdminAuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return this.adminAuthService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.adminAuthService.login(loginDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.adminAuthService.verifyEmail(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.adminAuthService.requestPasswordReset(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.adminAuthService.resetPassword(resetDto);
  }

  @Patch('change-password')
  @UseGuards(AdminJwtAuthGuard)
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.adminAuthService.changePassword(req.user.id, changePasswordDto);
  }

  @Post('2fa/enable')
  @UseGuards(AdminJwtAuthGuard)
  async enable2FA(@Request() req) {
    return this.adminAuthService.enable2FA(req.user.id);
  }

  @Post('2fa/verify')
  @UseGuards(AdminJwtAuthGuard)
  async verify2FA(@Request() req, @Body('token') token: string) {
    return this.adminAuthService.verify2FA(req.user.id, token);
  }
}