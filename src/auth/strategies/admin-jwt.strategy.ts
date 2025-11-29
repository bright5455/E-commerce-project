import { Injectable, UnauthorizedException } from '@nestjs/common';
import { PassportStrategy } from '@nestjs/passport';
import { ExtractJwt, Strategy } from 'passport-jwt';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ConfigService } from '@nestjs/config';
import { Admin } from 'src/admin-auth/entity/admin-auth.entity';

@Injectable()
export class AdminJwtStrategy extends PassportStrategy(Strategy, 'admin-jwt') {
  constructor(
    @InjectRepository(Admin)
    private adminRepository: Repository<Admin>,
    private configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.getOrThrow('JWT_SECRET'),
    });
  }

  async validate(payload: any) {
    const admin = await this.adminRepository.findOne({ where: { id: payload.sub } });
    if (!admin || payload.role !== 'admin') {
      throw new UnauthorizedException();
    }
    return admin;
  }
}