import { Module } from '@nestjs/common';
import { ProfileService } from './profile.service';
import { ProfileController } from './profile.controller';
import { JwtModule } from '@nestjs/jwt';
import { ConfigModule, ConfigService } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from 'src/user/entity/user.entity';
import { PassportModule } from '@nestjs/passport';
import { UserModule } from 'src/user/user.module';
import { Admin } from 'src/admin-auth/entity/admin-auth.entity';


@Module({
imports: [
    ConfigModule.forRoot({ isGlobal: true }),

    TypeOrmModule.forFeature([User,Admin]),

    PassportModule.register({ defaultStrategy: 'jwt' }),

    JwtModule.registerAsync({
      imports: [ConfigModule],
      useFactory: async (configService: ConfigService) => ({
        secret: configService.get<string>('JWT_SECRET'),
        signOptions: { expiresIn: '1h' },
      }),
      inject: [ConfigService],
    }),

    UserModule,
        ProfileModule,
        
      ],


  providers: [ProfileService],
  controllers: [ProfileController]
})
export class ProfileModule {}
