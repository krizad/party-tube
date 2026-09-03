import { QueueService } from './queue.service';
import { RoomsService } from '../rooms/rooms.service';
export declare class QueueController {
    private readonly queueService;
    private readonly roomsService;
    constructor(queueService: QueueService, roomsService: RoomsService);
    getQueue(code: string): Promise<{
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
    getCurrent(code: string): Promise<{
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
    getHistory(code: string): Promise<{
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
