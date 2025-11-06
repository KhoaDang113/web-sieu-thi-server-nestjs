import { Module } from '@nestjs/common';
import { RealtimeGateway } from './realtime.gateway';
import { OrderRealtimeService } from './order-realtime.service';
import { ConfigModule } from '@nestjs/config';
import { CustomJwtService } from '../auth/customJwt.service';

@Module({
  imports: [ConfigModule],
  providers: [RealtimeGateway, OrderRealtimeService, CustomJwtService],
  exports: [OrderRealtimeService],
})
export class RealtimeModule {}
