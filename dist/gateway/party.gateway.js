"use strict";
var __decorate = (this && this.__decorate) || function (decorators, target, key, desc) {
    var c = arguments.length, r = c < 3 ? target : desc === null ? desc = Object.getOwnPropertyDescriptor(target, key) : desc, d;
    if (typeof Reflect === "object" && typeof Reflect.decorate === "function") r = Reflect.decorate(decorators, target, key, desc);
    else for (var i = decorators.length - 1; i >= 0; i--) if (d = decorators[i]) r = (c < 3 ? d(r) : c > 3 ? d(target, key, r) : d(target, key)) || r;
    return c > 3 && r && Object.defineProperty(target, key, r), r;
};
var __metadata = (this && this.__metadata) || function (k, v) {
    if (typeof Reflect === "object" && typeof Reflect.metadata === "function") return Reflect.metadata(k, v);
};
var __param = (this && this.__param) || function (paramIndex, decorator) {
    return function (target, key) { decorator(target, key, paramIndex); }
};
var PartyGateway_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.PartyGateway = void 0;
const websockets_1 = require("@nestjs/websockets");
const socket_io_1 = require("socket.io");
const common_1 = require("@nestjs/common");
const rooms_service_1 = require("../rooms/rooms.service");
const queue_service_1 = require("../queue/queue.service");
const prisma_service_1 = require("../prisma/prisma.service");
let PartyGateway = PartyGateway_1 = class PartyGateway {
    constructor(roomsService, queueService, prisma) {
        this.roomsService = roomsService;
        this.queueService = queueService;
        this.prisma = prisma;
        this.logger = new common_1.Logger(PartyGateway_1.name);
        this.socketRoomMap = new Map();
        this.roomMembers = new Map();
    }
    async handleConnection(client) {
        this.logger.log(`Client connected: ${client.id}`);
    }
    async handleDisconnect(client) {
        this.logger.log(`Client disconnected: ${client.id}`);
        const session = this.socketRoomMap.get(client.id);
        if (session) {
            this.socketRoomMap.delete(client.id);
            const roomCode = session.roomCode;
            if (this.roomMembers.has(roomCode)) {
                this.roomMembers.get(roomCode).delete(client.id);
                const members = Array.from(this.roomMembers.get(roomCode).values());
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
            }
            catch (err) {
                this.logger.error(`Error handling disconnect for ${client.id}:`, err);
            }
        }
    }
    async broadcastRoomState(roomCode, isPlaying = true) {
        try {
            const normalizedCode = roomCode.toUpperCase();
            const room = await this.prisma.room.findUnique({
                where: { code: normalizedCode },
                include: { sessions: true },
            });
            if (!room)
                return;
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
            this.server.to(`room:${normalizedCode}`).emit('queue:updated', queue.filter((item) => item.status === 'PENDING'));
            this.server.to(`room:${normalizedCode}`).emit('queue:history', history);
        }
        catch (err) {
            this.logger.error(`Error broadcasting room state for ${roomCode}:`, err);
        }
    }
    async handleJoinRoom(client, payload) {
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
            if (!this.roomMembers.has(roomCode)) {
                this.roomMembers.set(roomCode, new Map());
            }
            const member = {
                socketId: client.id,
                nickname,
                role: payload.role,
                isHost,
                joinedAt: Date.now(),
            };
            this.roomMembers.get(roomCode).set(client.id, member);
            const members = Array.from(this.roomMembers.get(roomCode).values());
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
        }
        catch (err) {
            this.logger.error(`Join room error: ${err.message}`);
            client.emit('error:message', {
                code: 'JOIN_ERROR',
                message: 'Could not join room',
            });
        }
    }
    async handleAddQueue(client, payload) {
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
        }
        catch (err) {
            this.logger.warn(`Add queue error: ${err.message}`);
            client.emit('error:message', {
                code: 'QUEUE_ADD_ERROR',
                message: err.message || 'Could not add song to queue',
            });
        }
    }
    async handleRemoveQueue(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                return;
            const nextTrack = await this.queueService.removeTrack(room.id, payload.queueItemId);
            if (nextTrack !== undefined) {
                this.server.to(`room:${roomCode}`).emit('track:now_playing', {
                    track: nextTrack,
                    startedAt: Date.now(),
                    isPlaying: Boolean(nextTrack),
                });
            }
            await this.broadcastRoomState(roomCode);
        }
        catch (err) {
            this.logger.error(`Remove queue error: ${err.message}`);
            client.emit('error:message', { code: 'QUEUE_REMOVE_ERROR', message: err.message });
        }
    }
    async handleReorderQueue(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                return;
            if (!payload.hostToken || room.hostToken !== payload.hostToken) {
                client.emit('error:message', { code: 'UNAUTHORIZED', message: 'Only host can reorder queue' });
                return;
            }
            await this.queueService.reorderQueue(room.id, payload.sourceIndex, payload.destinationIndex);
            await this.broadcastRoomState(roomCode);
        }
        catch (err) {
            this.logger.error(`Reorder queue error: ${err.message}`);
        }
    }
    async handlePlayerSeek(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            if (!roomCode)
                return;
            const session = this.socketRoomMap.get(client.id);
            const by = payload.by || session?.nickname || 'Guest';
            this.server.to(`room:${roomCode}`).emit('player:seek_command', {
                time: payload.time,
                by,
            });
        }
        catch (err) {
            this.logger.error(`Player seek error: ${err.message}`);
        }
    }
    async handlePlayerTimeUpdate(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            if (!roomCode)
                return;
            client.to(`room:${roomCode}`).emit('player:time_sync', {
                currentTime: payload.currentTime,
                duration: payload.duration,
            });
        }
        catch (err) {
            this.logger.error(`Player time update error: ${err.message}`);
        }
    }
    async handlePlayerStateChange(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                return;
            if (payload.state === 'ended') {
                const nextTrack = await this.queueService.getNextTrack(room.id);
                this.server.to(`room:${roomCode}`).emit('track:now_playing', {
                    track: nextTrack,
                    startedAt: Date.now(),
                    isPlaying: Boolean(nextTrack),
                });
                await this.broadcastRoomState(roomCode);
            }
            else {
                const isPlaying = payload.state === 'playing';
                this.server.to(`room:${roomCode}`).emit('player:sync', {
                    state: payload.state,
                    currentTime: payload.currentTime,
                });
                await this.broadcastRoomState(roomCode, isPlaying);
            }
        }
        catch (err) {
            this.logger.error(`Player state change error: ${err.message}`);
        }
    }
    async handlePlaybackError(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                return;
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
        }
        catch (err) {
            this.logger.error(`Playback error handler failed: ${err.message}`);
        }
    }
    async handlePlayerSkip(client, payload) {
        try {
            const roomCode = payload.roomCode?.trim().toUpperCase();
            const room = await this.prisma.room.findUnique({ where: { code: roomCode } });
            if (!room)
                return;
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
        }
        catch (err) {
            this.logger.error(`Skip track error: ${err.message}`);
        }
    }
};
exports.PartyGateway = PartyGateway;
__decorate([
    (0, websockets_1.WebSocketServer)(),
    __metadata("design:type", socket_io_1.Server)
], PartyGateway.prototype, "server", void 0);
__decorate([
    (0, websockets_1.SubscribeMessage)('room:join'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handleJoinRoom", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('queue:add'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handleAddQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('queue:remove'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handleRemoveQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('queue:reorder'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handleReorderQueue", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('player:seek'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handlePlayerSeek", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('player:time_update'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handlePlayerTimeUpdate", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('player:state_change'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handlePlayerStateChange", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('player:playback_error'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handlePlaybackError", null);
__decorate([
    (0, websockets_1.SubscribeMessage)('player:skip'),
    __param(0, (0, websockets_1.ConnectedSocket)()),
    __param(1, (0, websockets_1.MessageBody)()),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [socket_io_1.Socket, Object]),
    __metadata("design:returntype", Promise)
], PartyGateway.prototype, "handlePlayerSkip", null);
exports.PartyGateway = PartyGateway = PartyGateway_1 = __decorate([
    (0, websockets_1.WebSocketGateway)({
        cors: {
            origin: '*',
        },
        pingInterval: 20_000,
        pingTimeout: 60_000,
    }),
    __metadata("design:paramtypes", [rooms_service_1.RoomsService,
        queue_service_1.QueueService,
        prisma_service_1.PrismaService])
], PartyGateway);
//# sourceMappingURL=party.gateway.js.map