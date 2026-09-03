import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import * as crypto from 'crypto';

@Injectable()
export class RoomsService {
  constructor(private readonly prisma: PrismaService) {}

  generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // omit easily confused chars (I, 1, O, 0)
    let code = '';
    for (let i = 0; i < 6; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
  }

  generateHostToken(): string {
    return crypto.randomBytes(24).toString('hex');
  }

  async createRoom(title?: string) {
    let code = this.generateRoomCode();
    let collision = await this.prisma.room.findUnique({ where: { code } });

    // Handle collision if any
    let attempts = 0;
    while (collision && attempts < 5) {
      code = this.generateRoomCode();
      collision = await this.prisma.room.findUnique({ where: { code } });
      attempts++;
    }

    const hostToken = this.generateHostToken();

    const room = await this.prisma.room.create({
      data: {
        code,
        hostToken,
        title: title || `Party ${code}`,
        status: 'ACTIVE',
      },
    });

    return {
      id: room.id,
      code: room.code,
      hostToken: room.hostToken,
      title: room.title,
    };
  }

  async getRoomByCode(code: string) {
    const normalizedCode = code.trim().toUpperCase();
    const room = await this.prisma.room.findUnique({
      where: { code: normalizedCode },
      include: {
        queueItems: {
          where: {
            status: {
              in: ['PENDING', 'PLAYING'],
            },
          },
          orderBy: {
            orderIndex: 'asc',
          },
        },
        sessions: true,
      },
    });

    if (!room) {
      throw new NotFoundException(`Room with code ${normalizedCode} not found`);
    }

    return {
      id: room.id,
      code: room.code,
      title: room.title,
      status: room.status,
      currentQueueItemId: room.currentQueueItemId,
      queueLength: room.queueItems.length,
      guestCount: room.sessions.length,
    };
  }

  async verifyHost(code: string, hostToken: string): Promise<boolean> {
    const normalizedCode = code.trim().toUpperCase();
    const room = await this.prisma.room.findUnique({
      where: { code: normalizedCode },
    });

    if (!room) {
      throw new NotFoundException(`Room with code ${normalizedCode} not found`);
    }

    if (!hostToken || room.hostToken !== hostToken) {
      throw new UnauthorizedException('Invalid host credentials');
    }

    return true;
  }
}
