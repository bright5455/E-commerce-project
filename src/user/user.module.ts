import { Module } from '@nestjs/common';
import { UserService } from './user.service';
import { UserController } from './user.controller';
import { User } from './entity/user.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { RefreshToken } from './entity/refresh-token.entity';

@Module({
   imports: [TypeOrmModule.forFeature([User,RefreshToken])],
  providers: [UserService],
  controllers: [UserController],
   exports: [TypeOrmModule, UserService], 
})
export class UserModule {}