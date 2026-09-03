import { Module } from '@nestjs/common';
import { PartyGateway } from './party.gateway';
import { RoomsModule } from '../rooms/rooms.module';
import { QueueModule } from '../queue/queue.module';

@Module({
  imports: [RoomsModule, QueueModule],
  providers: [PartyGateway],
  exports: [PartyGateway],
})
export class GatewayModule {}
