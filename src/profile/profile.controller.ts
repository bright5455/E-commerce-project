import {
  Controller,
  Get,
  Post,
  Patch,
  Body,
  UseGuards,
  UseInterceptors,
  UploadedFile,
  ClassSerializerInterceptor,
  ParseFilePipe,
  MaxFileSizeValidator,
  FileTypeValidator,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiBearerAuth,
  ApiResponse,
  ApiConsumes,
  ApiBody,
} from '@nestjs/swagger';
import { FileInterceptor } from '@nestjs/platform-express';
import { Throttle } from '@nestjs/throttler';
import { memoryStorage } from 'multer';
import { ProfileService } from './profile.service';
import { UpdateProfileDto } from './dto/profile.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/role.decorator';
import { User } from '../auth/decorators/user.decorator';
import { UserRole } from '../user/entity/user.entity';

@ApiTags('profile')
@Controller('profile')
@UseGuards(JwtAuthGuard)
@UseInterceptors(ClassSerializerInterceptor)
@ApiBearerAuth()
export class ProfileController {
  constructor(private readonly profileService: ProfileService) {}

 
  @Get()
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiResponse({ status: 200, description: 'User profile retrieved successfully' })
  async getUser(@User('id') userId: string) {
    return this.profileService.getUserProfile(userId);
  }

  @Patch()
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Update user profile' })
  @ApiResponse({ status: 200, description: 'Profile updated successfully' })
  async updateUser(@User('id') userId: string, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateUserProfile(userId, dto);
  }

  @Post('avatar')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      limits: { fileSize: 5 * 1024 * 1024 }, 
    }),
  )
  @Throttle({ default: { limit: 5, ttl: 60000 } })
  @ApiConsumes('multipart/form-data')
  @ApiOperation({ summary: 'Upload profile avatar' })
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Profile avatar image (PNG, JPG, JPEG, WEBP - Max 5MB)',
        },
      },
    },
  })
  @ApiResponse({ 
    status: 200, 
    description: 'Avatar uploaded successfully',
    schema: {
      type: 'object',
      properties: {
        message: { type: 'string' },
        avatarUrl: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 400, description: 'Invalid file type or size' })
  async uploadAvatar(
    @User('id') userId: string,
    @UploadedFile(
      new ParseFilePipe({
        validators: [
          new MaxFileSizeValidator({ maxSize: 5 * 1024 * 1024 }), 
          new FileTypeValidator({ fileType: /^image\/(png|jpe?g|webp)$/ }),
        ],
        fileIsRequired: true,
      }),
    )
    file: Express.Multer.File,
  ) {
    return this.profileService.uploadAvatar(userId, file);
  }

  
  @Get('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @ApiOperation({ summary: 'Get admin profile (Admin only)' })
  @ApiResponse({ status: 200, description: 'Admin profile retrieved successfully' })
  async getAdmin(@User('id') adminId: string) {
    return this.profileService.getAdminProfile(adminId);
  }

  @Patch('admin')
  @UseGuards(RolesGuard)
  @Roles(UserRole.SUPER_ADMIN, UserRole.ADMIN, UserRole.MODERATOR)
  @Throttle({ default: { limit: 10, ttl: 60000 } })
  @ApiOperation({ summary: 'Update admin profile (Admin only)' })
  @ApiResponse({ status: 200, description: 'Admin profile updated successfully' })
  async updateAdmin(@User('id') adminId: string, @Body() dto: UpdateProfileDto) {
    return this.profileService.updateAdminProfile(adminId, dto);
  }
}