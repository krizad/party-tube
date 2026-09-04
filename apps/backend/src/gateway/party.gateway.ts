import {
  ConnectedSocket,
  MessageBody,
  OnGatewayConnection,
  OnGatewayDisconnect,
  SubscribeMessage,
  WebSocketGateway,
  WebSocketServer,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { Logger } from '@nestjs/common';
import { RoomsService } from '../rooms/rooms.service';
import { QueueService } from '../queue/queue.service';
import { PrismaService } from '../prisma/prisma.service';
import {
  AddQueueItemPayload,
  JoinRoomPayload,
  PlayerSeekPayload,
  PlayerSkipPayload,
  PlayerStateChangePayload,
  PlayerTimeUpdatePayload,
  RemoveQueueItemPayload,
  ReorderQueuePayload,
  RoomMember,
} from '@partytube/shared-types';

@WebSocketGateway({
  cors: {
    origin: '*',
  },
  pingInterval: 20_000,
  pingTimeout: 60_000,
})
export class PartyGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  private readonly logger = new Logger(PartyGateway.name);
  private socketRoomMap = new Map<string, { roomCode: string; nickname: string; role: 'host' | 'guest' }>();
  private roomMembers = new Map<string, Map<string, RoomMember>>();

  constructor(
    private readonly roomsService: RoomsService,
    private readonly queueService: QueueService,
    private readonly prisma: PrismaService,
  ) {}

  async handleConnection(client: Socket) {
    this.logger.log(`Client connected: ${client.id}`);
  }

  async handleDisconnect(client: Socket) {
    this.logger.log(`Client disconnected: ${client.id}`);
    const session = this.socketRoomMap.get(client.id);
    if (session) {
      this.socketRoomMap.delete(client.id);
      const roomCode = session.roomCode;

      // Remove from active room members
      if (this.roomMembers.has(roomCode)) {
        this.roomMembers.get(roomCode)!.delete(client.id);
        const members = Array.from(this.roomMembers.get(roomCode)!.values());
        this.server.to(`room:${roomCode}`).emit('room:members', members);
      }

      try {
        const room = await this.prisma.room.findUnique({
          where: { code: roomCode },
        });
        if (room) {
          await this.prisma.guestSession.deleteMany({
            where: { roomId: room.id, socketId: client.id },
          });

          const guestCount = await this.prisma.guestSession.count({
            where: { roomId: room.id },
          });

          const currentMembers = Array.from(this.roomMembers.get(roomCode)?.values() || []);

          this.server.to(`room:${roomCode}`).emit('guest:left', {
            nickname: session.nickname,
            guestCount,
            members: currentMembers,
          });

          await this.broadcastRoomState(roomCode);
        }
      } catch (err) {
        this.logger.error(`Error handling disconnect for ${client.id}:`, err);
      }
    }
  }

  private async broadcastRoomState(roomCode: string, isPlaying: boolean = true) {
    try {
      const normalizedCode = roomCode.toUpperCase();
      const room = await this.prisma.room.findUnique({
        where: { code: normalizedCode },
        include: { sessions: true },
      });

      if (!room) return;

      const queue = await this.queueService.getQueue(room.id);
      const history = await this.queueService.getHistory(room.id);
      const currentTrack = await this.queueService.getCurrentTrack(room.id);
      const members = Array.from(this.roomMembers.get(normalizedCode)?.values() || []);

      this.server.to(`room:${normalizedCode}`).emit('room:state', {
        roomId: room.id,
        roomCode: room.code,
        title: room.title,
        currentTrack,
        queue: queue.filter((item) => item.status === 'PENDING'),
        history,
        members,
        guestCount: room.sessions.length,
        isPlaying: Boolean(currentTrack) && isPlaying,
        status: room.status,
      });

      this.server.to(`room:${normalizedCode}`).emit(
        'queue:updated',
        queue.filter((item) => item.status === 'PENDING'),
      );

      this.server.to(`room:${normalizedCode}`).emit('queue:history', history);
    } catch (err) {
      this.logger.error(`Error broadcasting room state for ${roomCode}:`, err);
    }
  }

  @SubscribeMessage('room:join')
  async handleJoinRoom(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: JoinRoomPayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({
        where: { code: roomCode },
      });

      if (!room) {
        client.emit('error:message', {
          code: 'ROOM_NOT_FOUND',
          message: `Room ${roomCode} not found`,
        });
        return;
      }

      const isHost = payload.role === 'host';

      if (isHost && payload.hostToken) {
        if (room.hostToken !== payload.hostToken) {
          client.emit('error:message', {
            code: 'UNAUTHORIZED_HOST',
            message: 'Invalid host token',
          });
          return;
        }
      }

      const nickname = payload.nickname?.trim() || (isHost ? 'Host (TV)' : 'Party Guest');

      client.join(`room:${roomCode}`);
      this.socketRoomMap.set(client.id, {
        roomCode,
        nickname,
        role: payload.role,
      });

      // Track member in memory
      if (!this.roomMembers.has(roomCode)) {
        this.roomMembers.set(roomCode, new Map());
      }
      const member: RoomMember = {
        socketId: client.id,
        nickname,
        role: payload.role,
        isHost,
        joinedAt: Date.now(),
      };
      this.roomMembers.get(roomCode)!.set(client.id, member);
      const members = Array.from(this.roomMembers.get(roomCode)!.values());

      await this.prisma.guestSession.create({
        data: {
          roomId: room.id,
          socketId: client.id,
          nickname,
        },
      });

      const guestCount = await this.prisma.guestSession.count({
        where: { roomId: room.id },
      });

      const currentTrack = await this.queueService.getCurrentTrack(room.id);
      const queue = await this.queueService.getQueue(room.id);
      const history = await this.queueService.getHistory(room.id);

      client.emit('room:state', {
        roomId: room.id,
        roomCode: room.code,
        title: room.title,
        currentTrack,
        queue: queue.filter((item) => item.status === 'PENDING'),
        history,
        members,
        guestCount,
        isPlaying: Boolean(currentTrack),
        status: room.status,
      });

      this.server.to(`room:${roomCode}`).emit('room:members', members);

      client.to(`room:${roomCode}`).emit('guest:joined', {
        nickname,
        guestCount,
        members,
      });

      await this.broadcastRoomState(roomCode);
    } catch (err: any) {
      this.logger.error(`Join room error: ${err.message}`);
      client.emit('error:message', {
        code: 'JOIN_ERROR',
        message: 'Could not join room',
      });
    }
  }

  @SubscribeMessage('queue:add')
  async handleAddQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: AddQueueItemPayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({
        where: { code: roomCode },
      });

      if (!room) {
        client.emit('error:message', { code: 'ROOM_NOT_FOUND', message: 'Room not found' });
        return;
      }

      const session = this.socketRoomMap.get(client.id);
      const isHost = session?.role === 'host' || payload.addedBy === 'Host (TV)';

      await this.queueService.addTrack(room.id, {
        videoId: payload.videoId,
        title: payload.title,
        thumbnailUrl: payload.thumbnailUrl,
        channelTitle: payload.channelTitle,
        durationSeconds: payload.durationSeconds || 0,
        addedBy: isHost ? 'Host (TV)' : (payload.addedBy || 'Party Guest'),
        isHost,
      });

      // Q2 Decision: Broadcast toast notification when Host adds a song
      if (isHost) {
        this.server.to(`room:${roomCode}`).emit('toast:host_added', {
          title: payload.title,
          addedBy: 'Host',
        });
      }

      const currentPlaying = await this.queueService.getCurrentTrack(room.id);
      if (!currentPlaying) {
        const nextTrack = await this.queueService.getNextTrack(room.id);
        if (nextTrack) {
          this.server.to(`room:${roomCode}`).emit('track:now_playing', {
            track: nextTrack,
            startedAt: Date.now(),
            isPlaying: true,
          });
        }
      }

      await this.broadcastRoomState(roomCode);
    } catch (err: any) {
      this.logger.warn(`Add queue error: ${err.message}`);
      client.emit('error:message', {
        code: 'QUEUE_ADD_ERROR',
        message: err.message || 'Could not add song to queue',
      });
    }
  }

  @SubscribeMessage('queue:remove')
  async handleRemoveQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: RemoveQueueItemPayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      const nextTrack = await this.queueService.removeTrack(room.id, payload.queueItemId);
      if (nextTrack !== undefined) {
        this.server.to(`room:${roomCode}`).emit('track:now_playing', {
          track: nextTrack,
          startedAt: Date.now(),
          isPlaying: Boolean(nextTrack),
        });
      }

      await this.broadcastRoomState(roomCode);
    } catch (err: any) {
      this.logger.error(`Remove queue error: ${err.message}`);
      client.emit('error:message', { code: 'QUEUE_REMOVE_ERROR', message: err.message });
    }
  }

  @SubscribeMessage('queue:reorder')
  async handleReorderQueue(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: ReorderQueuePayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      if (!payload.hostToken || room.hostToken !== payload.hostToken) {
        client.emit('error:message', { code: 'UNAUTHORIZED', message: 'Only host can reorder queue' });
        return;
      }

      await this.queueService.reorderQueue(room.id, payload.sourceIndex, payload.destinationIndex);
      await this.broadcastRoomState(roomCode);
    } catch (err: any) {
      this.logger.error(`Reorder queue error: ${err.message}`);
    }
  }

  @SubscribeMessage('player:seek')
  async handlePlayerSeek(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerSeekPayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      if (!roomCode) return;

      const session = this.socketRoomMap.get(client.id);
      const by = payload.by || session?.nickname || 'Guest';

      // Q1 (Option B): Broadcast seek command to Host TV player
      this.server.to(`room:${roomCode}`).emit('player:seek_command', {
        time: payload.time,
        by,
      });
    } catch (err: any) {
      this.logger.error(`Player seek error: ${err.message}`);
    }
  }

  @SubscribeMessage('player:time_update')
  async handlePlayerTimeUpdate(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerTimeUpdatePayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      if (!roomCode) return;

      // Broadcast playback time progress to all guests
      client.to(`room:${roomCode}`).emit('player:time_sync', {
        currentTime: payload.currentTime,
        duration: payload.duration,
      });
    } catch (err: any) {
      this.logger.error(`Player time update error: ${err.message}`);
    }
  }

  @SubscribeMessage('player:state_change')
  async handlePlayerStateChange(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerStateChangePayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      if (payload.state === 'ended') {
        const nextTrack = await this.queueService.getNextTrack(room.id);
        this.server.to(`room:${roomCode}`).emit('track:now_playing', {
          track: nextTrack,
          startedAt: Date.now(),
          isPlaying: Boolean(nextTrack),
        });
        await this.broadcastRoomState(roomCode);
      } else {
        const isPlaying = payload.state === 'playing';
        this.server.to(`room:${roomCode}`).emit('player:sync', {
          state: payload.state,
          currentTime: payload.currentTime,
        });
        await this.broadcastRoomState(roomCode, isPlaying);
      }
    } catch (err: any) {
      this.logger.error(`Player state change error: ${err.message}`);
    }
  }

  @SubscribeMessage('player:playback_error')
  async handlePlaybackError(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: { roomCode: string; trackTitle?: string },
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      this.server.to(`room:${roomCode}`).emit('error:message', {
        code: 'UNEMBEDDABLE_VIDEO',
        message: `Video "${payload.trackTitle || 'Track'}" is restricted from embed playback. Auto-skipping to next song...`,
      });

      const nextTrack = await this.queueService.skipTrack(room.id);
      this.server.to(`room:${roomCode}`).emit('track:now_playing', {
        track: nextTrack,
        startedAt: Date.now(),
        isPlaying: Boolean(nextTrack),
      });

      await this.broadcastRoomState(roomCode);
    } catch (err: any) {
      this.logger.error(`Playback error handler failed: ${err.message}`);
    }
  }

  @SubscribeMessage('player:skip')
  async handlePlayerSkip(
    @ConnectedSocket() client: Socket,
    @MessageBody() payload: PlayerSkipPayload,
  ) {
    try {
      const roomCode = payload.roomCode?.trim().toUpperCase();
      const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
      if (!room) return;

      if (!payload.hostToken || room.hostToken !== payload.hostToken) {
        client.emit('error:message', { code: 'UNAUTHORIZED', message: 'Only host can skip tracks' });
        return;
      }

      const nextTrack = await this.queueService.skipTrack(room.id);
      this.server.to(`room:${roomCode}`).emit('track:now_playing', {
        track: nextTrack,
        startedAt: Date.now(),
        isPlaying: Boolean(nextTrack),
      });

      await this.broadcastRoomState(roomCode);
    } catch (err: any) {
      this.logger.error(`Skip track error: ${err.message}`);
    }
  }
}
