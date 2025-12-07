import { Injectable, NotFoundException, ForbiddenException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository, Like } from 'typeorm';
import { User, UserRole } from './entity/user.entity';
import { UpdateUserDto } from './dto/user.dto';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(User)
    private readonly userRepository: Repository<User>,
  ) {}

  private isAdminUser(user: User): boolean {
    return [
      UserRole.ADMIN,
      UserRole.SUPER_ADMIN,
      UserRole.MODERATOR,
    ].includes(user.role);
  }

  async findAll(query: any, currentUser: User) {
    if (!this.isAdminUser(currentUser)) {
      throw new ForbiddenException('Access denied.');
    }

    const page = Number(query.page) || 1;
    const limit = Number(query.limit) || 10;
    const search = query.search || '';

    const [users, total] = await this.userRepository.findAndCount({
      where: [
        { email: Like(`%${search}%`) },
        { firstName: Like(`%${search}%`) },
        { lastName: Like(`%${search}%`) },
      ],
      take: limit,
      skip: (page - 1) * limit,
      order: { createdAt: 'DESC' },
    });

    return {
      data: users,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit),
      },
    };
  }

  async findOne(id: string) {
    const user = await this.userRepository.findOne({ where: { id } });

    if (!user) {
      throw new NotFoundException('User not found');
    }

    return user;
  }

  async findByEmail(email: string) {
    return await this.userRepository.findOne({ where: { email } });
  }


  async update(id: string, updateUserDto: UpdateUserDto) {
    const user = await this.findOne(id);

    Object.assign(user, updateUserDto);

    return await this.userRepository.save(user);
  }

  async deactivate(id: string, currentUser: User) {
    if (!this.isAdminUser(currentUser)) {
      throw new ForbiddenException('Admin rights required.');
    }

    const user = await this.findOne(id);
    user.isActive = false;

    return await this.userRepository.save(user);
  }


  async getStats(currentUser: User) {
    if (!this.isAdminUser(currentUser)) {
      throw new ForbiddenException('Admin rights required.');
    }

    const total = await this.userRepository.count();
    const active = await this.userRepository.count({ where: { isActive: true } });
    const admins = await this.userRepository.count({
      where: [
        { role: UserRole.ADMIN },
        { role: UserRole.SUPER_ADMIN },
        { role: UserRole.MODERATOR },
      ],
    });

    return {
      totalUsers: total,
      activeUsers: active,
      adminAccounts: admins,
    };
  }
}