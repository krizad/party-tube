import { Controller, Get, Param } from '@nestjs/common';
import { QueueService } from './queue.service';
import { RoomsService } from '../rooms/rooms.service';

@Controller('api/rooms/:code/queue')
export class QueueController {
  constructor(
    private readonly queueService: QueueService,
    private readonly roomsService: RoomsService,
  ) {}

  @Get()
  async getQueue(@Param('code') code: string) {
    const room = await this.roomsService.getRoomByCode(code);
    return this.queueService.getQueue(room.id);
  }

  @Get('current')
  async getCurrent(@Param('code') code: string) {
    const room = await this.roomsService.getRoomByCode(code);
    return this.queueService.getCurrentTrack(room.id);
  }

  @Get('history')
  async getHistory(@Param('code') code: string) {
    const room = await this.roomsService.getRoomByCode(code);
    return this.queueService.getHistory(room.id);
  }
}
