import { RoomsService } from './rooms.service';
import { CreateRoomDto } from './dto/create-room.dto';
export declare class RoomsController {
    private readonly roomsService;
    constructor(roomsService: RoomsService);
    createRoom(createRoomDto: CreateRoomDto): Promise<{
        id: string;
        code: string;
        hostToken: string;
        title: string;
    }>;
    getRoom(code: string): Promise<{
        id: string;
        code: string;
        title: string;
        status: string;
        currentQueueItemId: string;
        queueLength: number;
        guestCount: number;
    }>;
    verifyHost(code: string, hostToken: string): Promise<{
        valid: boolean;
    }>;
}
