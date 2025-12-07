import {
  Injectable,
  BadRequestException,
  ForbiddenException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from '../user/entity/user.entity';
import { UpdateProfileDto } from './dto/profile.dto';
import { CloudinaryService } from '../cloudinary/cloudinary.service';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
    private readonly cloudinaryService: CloudinaryService,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    return user;
  }

  async updateUserProfile(userId: string, dto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ 
      where: { id: userId } 
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    Object.assign(user, dto);
    return this.userRepository.save(user);
  }

  async uploadAvatar(userId: string, file: Express.Multer.File) {
    if (!file) {
      throw new BadRequestException('No file uploaded');
    }

    const allowedMimeTypes = ['image/jpeg', 'image/png', 'image/jpg', 'image/webp'];
    if (!allowedMimeTypes.includes(file.mimetype)) {
      throw new BadRequestException('Only image files (JPEG, PNG, WebP) are allowed');
    }

    const maxSize = 5 * 1024 * 1024;
    if (file.size > maxSize) {
      throw new BadRequestException('File size must not exceed 5MB');
    }

    const user = await this.userRepository.findOne({ 
      where: { id: userId } 
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    try {
      if (user.avatarUrl && user.cloudinaryPublicId) {
        await this.cloudinaryService.deleteImage(user.cloudinaryPublicId);
      }

      const result = await this.cloudinaryService.uploadImage(file);
      
      user.avatarUrl = result.secure_url;
      user.cloudinaryPublicId = result.public_id;

      await this.userRepository.save(user);

      return {
        message: 'Avatar uploaded successfully',
        avatarUrl: user.avatarUrl,
      };
    } catch (error) {
      throw new BadRequestException(`Failed to upload avatar: ${error.message}`);
    }
  }


  async getAdminProfile(adminId: string) {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (!admin.isAdmin()) {
      throw new ForbiddenException('Not an admin');
    }

    return admin;
  }

  async updateAdminProfile(adminId: string, dto: UpdateProfileDto) {
    const admin = await this.userRepository.findOne({
      where: { id: adminId },
    });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    if (!admin.isAdmin()) {
      throw new ForbiddenException('Not an admin');
    }

    Object.assign(admin, dto);
    return this.userRepository.save(admin);
  }
}