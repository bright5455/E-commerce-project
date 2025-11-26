import { Controller, Post, Body, Get, Query, Patch, UseGuards, Request } from '@nestjs/common';
import { AuthService } from './auth.service';
import { RegisterUserDto, LoginDto, ResetPasswordDto, ChangePasswordDto } from './dto/auth.dto';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';

// TODO: Add @ApiTags('auth') and other Swagger decorators for documentation
// TODO: Add @Throttle() decorator for rate limiting on login/register endpoints
// TODO: Create a typed Request interface instead of using 'any' for req.user

@Controller('auth')
export class AuthController {
  constructor(private authService: AuthService) {}

  @Post('register')
  async register(@Body() registerDto: RegisterUserDto) {
    return this.authService.register(registerDto);
  }

  @Post('login')
  async login(@Body() loginDto: LoginDto) {
    return this.authService.login(loginDto);
  }

  @Get('verify-email')
  async verifyEmail(@Query('token') token: string) {
    return this.authService.verifyEmail(token);
  }

  @Post('forgot-password')
  async forgotPassword(@Body('email') email: string) {
    return this.authService.requestPasswordReset(email);
  }

  @Post('reset-password')
  async resetPassword(@Body() resetDto: ResetPasswordDto) {
    return this.authService.resetPassword(resetDto);
  }

  @Patch('change-password')
  @UseGuards(JwtAuthGuard)
  // FIXME: Add proper typing for request: @Request() req: RequestWithUser
  // Create interface: interface RequestWithUser extends Request { user: { id: string; email: string; } }
  async changePassword(@Request() req, @Body() changePasswordDto: ChangePasswordDto) {
    return this.authService.changePassword(req.user.id, changePasswordDto);
  }

  // TODO: Add logout endpoint that invalidates refresh token
  // TODO: Add refresh token endpoint: @Post('refresh')
}