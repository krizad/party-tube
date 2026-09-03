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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const MAX_PENDING_PER_GUEST = 5;
let QueueService = class QueueService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    async getQueue(roomId) {
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
    async getHistory(roomId) {
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
    async getCurrentTrack(roomId) {
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
    async addTrack(roomId, input) {
        const room = await this.prisma.room.findUnique({
            where: { id: roomId },
        });
        if (!room) {
            throw new common_1.NotFoundException('Room not found');
        }
        const existingPending = await this.prisma.queueItem.findFirst({
            where: {
                roomId,
                videoId: input.videoId,
                status: 'PENDING',
            },
        });
        if (existingPending) {
            throw new common_1.BadRequestException(`"${input.title}" is already in the queue!`);
        }
        if (!input.isHost && input.addedBy !== 'Host (TV)') {
            const pendingCount = await this.prisma.queueItem.count({
                where: {
                    roomId,
                    addedBy: input.addedBy,
                    status: 'PENDING',
                },
            });
            if (pendingCount >= MAX_PENDING_PER_GUEST) {
                throw new common_1.BadRequestException(`You have reached the maximum quota of ${MAX_PENDING_PER_GUEST} pending songs! Please wait for your songs to play before adding more.`);
            }
        }
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
    async getNextTrack(roomId) {
        return this.prisma.$transaction(async (tx) => {
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
    async skipTrack(roomId) {
        return this.getNextTrack(roomId);
    }
    async removeTrack(roomId, queueItemId) {
        const item = await this.prisma.queueItem.findUnique({
            where: { id: queueItemId },
        });
        if (!item || item.roomId !== roomId) {
            throw new common_1.NotFoundException('Queue item not found in this room');
        }
        await this.prisma.queueItem.delete({
            where: { id: queueItemId },
        });
        if (item.status === 'PLAYING') {
            return this.getNextTrack(roomId);
        }
        return undefined;
    }
    async reorderQueue(roomId, sourceIndex, destinationIndex) {
        const pendingItems = await this.prisma.queueItem.findMany({
            where: { roomId, status: 'PENDING' },
            orderBy: { orderIndex: 'asc' },
        });
        if (sourceIndex < 0 ||
            sourceIndex >= pendingItems.length ||
            destinationIndex < 0 ||
            destinationIndex >= pendingItems.length) {
            throw new common_1.BadRequestException('Invalid reorder indices');
        }
        const [movedItem] = pendingItems.splice(sourceIndex, 1);
        pendingItems.splice(destinationIndex, 0, movedItem);
        await this.prisma.$transaction(pendingItems.map((item, index) => this.prisma.queueItem.update({
            where: { id: item.id },
            data: { orderIndex: index },
        })));
        return pendingItems;
    }
};
exports.QueueService = QueueService;
exports.QueueService = QueueService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], QueueService);
//# sourceMappingURL=queue.service.js.map