import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { UsersService } from './users.service';
import { UsersController } from './users.controller';
import { ProfileController } from './profile.controller';

@Module({
  imports: [PrismaModule],
  // ProfileController MUST be first so /users/me is matched before /users/:id
  controllers: [ProfileController, UsersController],
  providers: [UsersService],
  exports: [UsersService],
})
export class UsersModule {}
