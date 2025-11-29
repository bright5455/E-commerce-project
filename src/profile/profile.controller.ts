import { Controller } from '@nestjs/common';
import { Get, Patch, Body, UseGuards, Request } from '@nestjs/common';
import { JwtAuthGuard } from 'src/auth/guards/jwt-auth.guards';
import { ProfileService } from 'src/profile/profile.service';
import { UpdateProfileDto } from 'src/profile/dto/profile.dto';
import { AdminJwtAuthGuard } from 'src/auth/guards/admin-jwt-auth.guards';

@Controller('profile')
export class ProfileController {
  constructor(private profileService: ProfileService) {}

  @Get()
  @UseGuards(JwtAuthGuard)
  async getUserProfile(@Request() req) {
    return this.profileService.getUserProfile(req.user.id);
  }

  @Patch()
  @UseGuards(JwtAuthGuard)
  async updateUserProfile(@Request() req, @Body() updateProfileDto: UpdateProfileDto) {
    return this.profileService.updateUserProfile(req.user.id, updateProfileDto);
  }


   @Get('admin')
   @UseGuards(AdminJwtAuthGuard)
  async getAdminProfile(@Request() req) {
    return this.profileService.getAdminProfile(req.user.id);
  }


   @Patch('admin')
  @UseGuards(AdminJwtAuthGuard)
  async updateAdminProfile(
    @Request() req,
    @Body() updateProfileDto: UpdateProfileDto,
  ) {
    return this.profileService.updateAdminProfile(req.user.id, updateProfileDto);
  }
}


