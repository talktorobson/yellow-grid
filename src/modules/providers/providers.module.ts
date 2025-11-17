import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { ProvidersService } from './providers.service';
import { ProviderRankingService } from './provider-ranking.service';
import { ProvidersController } from './providers.controller';

@Module({
  imports: [PrismaModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderRankingService],
  exports: [ProvidersService, ProviderRankingService],
})
export class ProvidersModule {}
