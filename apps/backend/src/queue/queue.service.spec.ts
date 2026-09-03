import { Test, TestingModule } from '@nestjs/testing';
import { QueueService } from './queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { BadRequestException } from '@nestjs/common';

describe('QueueService', () => {
  let service: QueueService;
  let prisma: PrismaService;

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
      update: jest.fn(),
    },
    queueItem: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
      count: jest.fn(),
    },
    $transaction: jest.fn((callback) => callback(mockPrismaService)),
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        QueueService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<QueueService>(QueueService);
    prisma = module.get<PrismaService>(PrismaService);
  });

  afterEach(() => {
    jest.clearAllMocks();
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });

  describe('getHistory', () => {
    it('should return up to 50 played tracks ordered by playedAt desc', async () => {
      const mockHistory = [
        { id: 'track-1', title: 'Song 1', status: 'PLAYED' },
        { id: 'track-2', title: 'Song 2', status: 'PLAYED' },
      ];
      mockPrismaService.queueItem.findMany.mockResolvedValue(mockHistory);

      const history = await service.getHistory('room-1');

      expect(history).toEqual(mockHistory);
      expect(mockPrismaService.queueItem.findMany).toHaveBeenCalledWith({
        where: { roomId: 'room-1', status: 'PLAYED' },
        orderBy: { playedAt: 'desc' },
        take: 50,
      });
    });
  });

  describe('addTrack', () => {
    it('should add a track to the end of the queue with correct orderIndex', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ABC123' });
      mockPrismaService.queueItem.findFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce({ orderIndex: 2 }); // last item orderIndex
      mockPrismaService.queueItem.count.mockResolvedValue(1); // 1 active song
      mockPrismaService.queueItem.create.mockResolvedValue({
        id: 'item-1',
        roomId: 'room-1',
        videoId: 'vid123',
        title: 'Song A',
        thumbnailUrl: 'https://img.jpg',
        channelTitle: 'Artist',
        durationSeconds: 180,
        addedBy: 'Bob',
        status: 'PENDING',
        orderIndex: 3,
      });

      const result = await service.addTrack('room-1', {
        videoId: 'vid123',
        title: 'Song A',
        thumbnailUrl: 'https://img.jpg',
        channelTitle: 'Artist',
        durationSeconds: 180,
        addedBy: 'Bob',
      });

      expect(result.orderIndex).toBe(3);
      expect(mockPrismaService.queueItem.create).toHaveBeenCalled();
    });

    it('should reject duplicate song if already PENDING in room', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ABC123' });
      mockPrismaService.queueItem.findFirst.mockResolvedValueOnce({ id: 'existing-item', status: 'PENDING' });

      await expect(
        service.addTrack('room-1', {
          videoId: 'vid123',
          title: 'Song A',
          thumbnailUrl: 'https://img.jpg',
          channelTitle: 'Artist',
          durationSeconds: 180,
          addedBy: 'Bob',
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should reject if guest exceeds quota of 5 pending songs', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ABC123' });
      mockPrismaService.queueItem.findFirst.mockResolvedValueOnce(null); // no duplicate
      mockPrismaService.queueItem.count.mockResolvedValueOnce(5); // already 5 pending

      await expect(
        service.addTrack('room-1', {
          videoId: 'vid123',
          title: 'Song A',
          thumbnailUrl: 'https://img.jpg',
          channelTitle: 'Artist',
          durationSeconds: 180,
          addedBy: 'Bob',
          isHost: false,
        }),
      ).rejects.toThrow(BadRequestException);
    });

    it('should allow host to add songs even if above quota', async () => {
      mockPrismaService.room.findUnique.mockResolvedValue({ id: 'room-1', code: 'ABC123' });
      mockPrismaService.queueItem.findFirst
        .mockResolvedValueOnce(null) // no duplicate
        .mockResolvedValueOnce({ orderIndex: 10 }); // last item
      mockPrismaService.queueItem.create.mockResolvedValue({
        id: 'host-item',
        orderIndex: 11,
        status: 'PENDING',
      });

      const res = await service.addTrack('room-1', {
        videoId: 'vid456',
        title: 'Song Host',
        thumbnailUrl: 'https://img.jpg',
        channelTitle: 'Artist',
        durationSeconds: 180,
        addedBy: 'Host (TV)',
        isHost: true,
      });

      expect(res.orderIndex).toBe(11);
    });
  });

  describe('getNextTrack', () => {
    it('should transition current track to PLAYED and next track to PLAYING', async () => {
      mockPrismaService.queueItem.findFirst
        .mockResolvedValueOnce({ id: 'current-1', status: 'PLAYING' })
        .mockResolvedValueOnce({ id: 'next-1', status: 'PENDING', orderIndex: 0 });

      mockPrismaService.queueItem.update.mockResolvedValueOnce({ id: 'current-1', status: 'PLAYED' });
      mockPrismaService.queueItem.update.mockResolvedValueOnce({ id: 'next-1', status: 'PLAYING' });
      mockPrismaService.room.update.mockResolvedValue({ id: 'room-1', currentQueueItemId: 'next-1' });

      const nextTrack = await service.getNextTrack('room-1');

      expect(nextTrack?.id).toBe('next-1');
    });
  });
});
