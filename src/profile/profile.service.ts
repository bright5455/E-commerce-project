import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from 'src/user/entity/user.entity';
import { Admin } from 'src/admin-auth/entity/admin-auth.entity';
import { UpdateProfileDto } from 'src/profile/dto/profile.dto';
import { BadRequestException } from '@nestjs/common';

@Injectable()
export class ProfileService {
  constructor(
    @InjectRepository(User)
    private userRepository: Repository<User>,
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
  ) {}

  async getUserProfile(userId: string) {
    const user = await this.userRepository.findOne({
      where: { id: userId },
      relations: ['wallet'],
    });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async updateUserProfile(userId: string, updateProfileDto: UpdateProfileDto) {
    const user = await this.userRepository.findOne({ where: { id: userId } });

    if (!user) {
      throw new BadRequestException('User not found');
    }

    Object.assign(user, updateProfileDto);
    await this.userRepository.save(user);

    const { password, ...userWithoutPassword } = user;
    return userWithoutPassword;
  }

  async getAdminProfile(adminId: string) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    const { password, twoFactorSecret, ...adminWithoutSensitiveData } = admin;
    return adminWithoutSensitiveData;
  }

  async updateAdminProfile(adminId: string, updateProfileDto: UpdateProfileDto) {
    const admin = await this.adminRepository.findOne({ where: { id: adminId } });

    if (!admin) {
      throw new BadRequestException('Admin not found');
    }

    Object.assign(admin, updateProfileDto);
    await this.adminRepository.save(admin);

    const { password, twoFactorSecret, ...adminWithoutSensitiveData } = admin;
    return adminWithoutSensitiveData;
  }
}

