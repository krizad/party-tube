import { Test, TestingModule } from '@nestjs/testing';
import { RoomsService } from './rooms.service';
import { PrismaService } from '../prisma/prisma.service';

describe('RoomsService', () => {
  let service: RoomsService;

  const mockPrismaService = {
    room: {
      findUnique: jest.fn(),
      create: jest.fn(),
    },
  };

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [
        RoomsService,
        {
          provide: PrismaService,
          useValue: mockPrismaService,
        },
      ],
    }).compile();

    service = module.get<RoomsService>(RoomsService);
  });

  it('should generate valid 6-character room codes', () => {
    const code = service.generateRoomCode();
    expect(code).toHaveLength(6);
    expect(/^[A-Z0-9]{6}$/.test(code)).toBe(true);
  });

  it('should create room with host token and code', async () => {
    mockPrismaService.room.findUnique.mockResolvedValue(null);
    mockPrismaService.room.create.mockImplementation(({ data }) =>
      Promise.resolve({
        id: 'uuid-1',
        code: data.code,
        hostToken: data.hostToken,
        title: data.title,
        status: 'ACTIVE',
      }),
    );

    const room = await service.createRoom('Summer Party');
    expect(room.code).toHaveLength(6);
    expect(room.hostToken).toBeDefined();
    expect(room.title).toBe('Summer Party');
  });
});
