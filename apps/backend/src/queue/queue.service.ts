import { Injectable, NotFoundException, BadRequestException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';

export interface AddTrackInput {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  durationSeconds: number;
  addedBy: string;
  isHost?: boolean;
}

const MAX_PENDING_PER_GUEST = 5;

@Injectable()
export class QueueService {
  constructor(private readonly prisma: PrismaService) {}

  async getQueue(roomId: string) {
    return this.prisma.queueItem.findMany({
      where: {
        roomId,
        status: {
          in: ['PENDING', 'PLAYING'],
        },
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });
  }

  async getHistory(roomId: string) {
    return this.prisma.queueItem.findMany({
      where: {
        roomId,
        status: 'PLAYED',
      },
      orderBy: {
        playedAt: 'desc',
      },
      take: 50,
    });
  }

  async getCurrentTrack(roomId: string) {
    return this.prisma.queueItem.findFirst({
      where: {
        roomId,
        status: 'PLAYING',
      },
      orderBy: {
        orderIndex: 'asc',
      },
    });
  }

  async addTrack(roomId: string, input: AddTrackInput) {
    const room = await this.prisma.room.findUnique({
      where: { id: roomId },
    });

    if (!room) {
      throw new NotFoundException('Room not found');
    }

    // 1. Duplicate check (Q3 & Q6): Check if video is already PENDING
    const existingPending = await this.prisma.queueItem.findFirst({
      where: {
        roomId,
        videoId: input.videoId,
        status: 'PENDING',
      },
    });

    if (existingPending) {
      throw new BadRequestException(`"${input.title}" is already in the queue!`);
    }

    // 2. Fairness Quota check (Q1 & Q5): Max 5 pending songs per guest (Host exempt)
    if (!input.isHost && input.addedBy !== 'Host (TV)') {
      const pendingCount = await this.prisma.queueItem.count({
        where: {
          roomId,
          addedBy: input.addedBy,
          status: 'PENDING',
        },
      });

      if (pendingCount >= MAX_PENDING_PER_GUEST) {
        throw new BadRequestException(
          `You have reached the maximum quota of ${MAX_PENDING_PER_GUEST} pending songs! Please wait for your songs to play before adding more.`,
        );
      }
    }

    // Find the highest orderIndex in the room
    const lastItem = await this.prisma.queueItem.findFirst({
      where: { roomId },
      orderBy: { orderIndex: 'desc' },
    });

    const nextOrderIndex = (lastItem?.orderIndex ?? -1) + 1;

    return this.prisma.queueItem.create({
      data: {
        roomId,
        videoId: input.videoId,
        title: input.title,
        thumbnailUrl: input.thumbnailUrl,
        channelTitle: input.channelTitle,
        durationSeconds: input.durationSeconds,
        addedBy: input.addedBy,
        orderIndex: nextOrderIndex,
        status: 'PENDING',
      },
    });
  }

  async getNextTrack(roomId: string) {
    return this.prisma.$transaction(async (tx) => {
      // 1. Mark current PLAYING track as PLAYED
      const currentPlaying = await tx.queueItem.findFirst({
        where: { roomId, status: 'PLAYING' },
      });

      if (currentPlaying) {
        await tx.queueItem.update({
          where: { id: currentPlaying.id },
          data: {
            status: 'PLAYED',
            playedAt: new Date(),
          },
        });
      }

      // 2. Find next PENDING track
      const nextPending = await tx.queueItem.findFirst({
        where: { roomId, status: 'PENDING' },
        orderBy: { orderIndex: 'asc' },
      });

      if (!nextPending) {
        await tx.room.update({
          where: { id: roomId },
          data: { currentQueueItemId: null },
        });
        return null;
      }

      // 3. Mark next track as PLAYING
      const playingTrack = await tx.queueItem.update({
        where: { id: nextPending.id },
        data: { status: 'PLAYING' },
      });

      await tx.room.update({
        where: { id: roomId },
        data: { currentQueueItemId: playingTrack.id },
      });

      return playingTrack;
    });
  }

  async skipTrack(roomId: string) {
    return this.getNextTrack(roomId);
  }

  async removeTrack(roomId: string, queueItemId: string) {
    const item = await this.prisma.queueItem.findUnique({
      where: { id: queueItemId },
    });

    if (!item || item.roomId !== roomId) {
      throw new NotFoundException('Queue item not found in this room');
    }

    await this.prisma.queueItem.delete({
      where: { id: queueItemId },
    });

    if (item.status === 'PLAYING') {
      return this.getNextTrack(roomId);
    }

    return undefined;
  }

  async reorderQueue(roomId: string, sourceIndex: number, destinationIndex: number) {
    const pendingItems = await this.prisma.queueItem.findMany({
      where: { roomId, status: 'PENDING' },
      orderBy: { orderIndex: 'asc' },
    });

    if (
      sourceIndex < 0 ||
      sourceIndex >= pendingItems.length ||
      destinationIndex < 0 ||
      destinationIndex >= pendingItems.length
    ) {
      throw new BadRequestException('Invalid reorder indices');
    }

    const [movedItem] = pendingItems.splice(sourceIndex, 1);
    pendingItems.splice(destinationIndex, 0, movedItem);

    await this.prisma.$transaction(
      pendingItems.map((item, index) =>
        this.prisma.queueItem.update({
          where: { id: item.id },
          data: { orderIndex: index },
        }),
      ),
    );

    return pendingItems;
  }
}
