import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { PrismaModule } from './prisma/prisma.module';
import { RoomsModule } from './rooms/rooms.module';
import { QueueModule } from './queue/queue.module';
import { YoutubeModule } from './youtube/youtube.module';
import { GatewayModule } from './gateway/gateway.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    PrismaModule,
    RoomsModule,
    QueueModule,
    YoutubeModule,
    GatewayModule,
  ],
})
export class AppModule {}
