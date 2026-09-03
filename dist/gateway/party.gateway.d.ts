import { OnGatewayConnection, OnGatewayDisconnect } from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { RoomsService } from '../rooms/rooms.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import { AddQueueItemPayload, JoinRoomPayload, PlayerSeekPayload, PlayerSkipPayload, PlayerStateChangePayload, PlayerTimeUpdatePayload, RemoveQueueItemPayload, ReorderQueuePayload } from '@partytube/shared-types';
export declare class PartyGateway implements OnGatewayConnection, OnGatewayDisconnect {
    private readonly roomsService;
    private readonly queueService;
    private readonly prisma;
    server: Server;
    private readonly logger;
    private socketRoomMap;
    private roomMembers;
    constructor(roomsService: RoomsService, queueService: QueueService, prisma: PrismaService);
    handleConnection(client: Socket): Promise<void>;
    handleDisconnect(client: Socket): Promise<void>;
    private broadcastRoomState;
    handleJoinRoom(client: Socket, payload: JoinRoomPayload): Promise<void>;
    handleAddQueue(client: Socket, payload: AddQueueItemPayload): Promise<void>;
    handleRemoveQueue(client: Socket, payload: RemoveQueueItemPayload): Promise<void>;
    handleReorderQueue(client: Socket, payload: ReorderQueuePayload): Promise<void>;
    handlePlayerSeek(client: Socket, payload: PlayerSeekPayload): Promise<void>;
    handlePlayerTimeUpdate(client: Socket, payload: PlayerTimeUpdatePayload): Promise<void>;
    handlePlayerStateChange(client: Socket, payload: PlayerStateChangePayload): Promise<void>;
    handlePlaybackError(client: Socket, payload: {
        roomCode: string;
        trackTitle?: string;
    }): Promise<void>;
    handlePlayerSkip(client: Socket, payload: PlayerSkipPayload): Promise<void>;
}
