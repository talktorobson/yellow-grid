import { Module } from '@nestjs/common';
import { PrismaModule } from '@/common/prisma/prisma.module';
import { DistanceModule } from '@/common/distance';
import { ProvidersService } from './providers.service';
import { ProviderRankingService } from './provider-ranking.service';
import { ProvidersController } from './providers.controller';
import { ProvidersEventHandler } from './providers.event-handler';

@Module({
  imports: [PrismaModule, DistanceModule],
  controllers: [ProvidersController],
  providers: [ProvidersService, ProviderRankingService, ProvidersEventHandler],
  exports: [ProvidersService, ProviderRankingService],
})
export class ProvidersModule {}
