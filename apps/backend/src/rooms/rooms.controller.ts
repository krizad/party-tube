import { Body, Controller, Get, Param, Post, Query } from '@nestjs/common';
import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';

@Controller('api/rooms')
export class RoomsController {
  constructor(private readonly roomsService: RoomsService) {}

  @Post()
  async createRoom(@Body() createRoomDto: CreateRoomDto) {
    return this.roomsService.createRoom(createRoomDto.title);
  }

  @Get(':code')
  async getRoom(@Param('code') code: string) {
    return this.roomsService.getRoomByCode(code);
  }

  @Get(':code/verify-host')
  async verifyHost(
    @Param('code') code: string,
    @Query('token') hostToken: string,
  ) {
    const isValid = await this.roomsService.verifyHost(code, hostToken);
    return { valid: isValid };
  }
}
