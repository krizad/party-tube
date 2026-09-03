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
export declare class QueueService {
    private readonly prisma;
    constructor(prisma: PrismaService);
    getQueue(roomId: string): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }[]>;
    getHistory(roomId: string): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }[]>;
    getCurrentTrack(roomId: string): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }>;
    addTrack(roomId: string, input: AddTrackInput): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }>;
    getNextTrack(roomId: string): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }>;
    skipTrack(roomId: string): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }>;
    removeTrack(roomId: string, queueItemId: string): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }>;
    reorderQueue(roomId: string, sourceIndex: number, destinationIndex: number): Promise<{
        id: string;
        title: string;
        status: string;
        createdAt: Date;
        orderIndex: number;
        roomId: string;
        videoId: string;
        thumbnailUrl: string;
        channelTitle: string;
        durationSeconds: number;
        addedBy: string;
        playedAt: Date | null;
    }[]>;
}
