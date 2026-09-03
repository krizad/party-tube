import { PrismaService } from '../prisma/prisma.service';
export declare class RoomsService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    generateRoomCode(): string;
    generateHostToken(): string;
    createRoom(title?: string): Promise<{
        id: string;
        code: string;
        hostToken: string;
        title: string;
    }>;
    getRoomByCode(code: string): Promise<{
        id: string;
        code: string;
        title: string;
        status: string;
        currentQueueItemId: string;
        queueLength: number;
        guestCount: number;
    }>;
    verifyHost(code: string, hostToken: string): Promise<boolean>;
}
