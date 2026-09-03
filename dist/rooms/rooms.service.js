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
exports.RoomsService = void 0;
const common_1 = require("@nestjs/common");
const prisma_service_1 = require("../prisma/prisma.service");
const crypto = require("crypto");
let RoomsService = class RoomsService {
    constructor(prisma) {
        this.prisma = prisma;
    }
    generateRoomCode() {
        const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
        let code = '';
        for (let i = 0; i < 6; i++) {
            code += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return code;
    }
    generateHostToken() {
        return crypto.randomBytes(24).toString('hex');
    }
    async createRoom(title) {
        let code = this.generateRoomCode();
        let collision = await this.prisma.room.findUnique({ where: { code } });
        let attempts = 0;
        while (collision && attempts < 5) {
            code = this.generateRoomCode();
            collision = await this.prisma.room.findUnique({ where: { code } });
            attempts++;
        }
        const hostToken = this.generateHostToken();
        const room = await this.prisma.room.create({
            data: {
                code,
                hostToken,
                title: title || `Party ${code}`,
                status: 'ACTIVE',
            },
        });
        return {
            id: room.id,
            code: room.code,
            hostToken: room.hostToken,
            title: room.title,
        };
    }
    async getRoomByCode(code) {
        const normalizedCode = code.trim().toUpperCase();
        const room = await this.prisma.room.findUnique({
            where: { code: normalizedCode },
            include: {
                queueItems: {
                    where: {
                        status: {
                            in: ['PENDING', 'PLAYING'],
                        },
                    },
                    orderBy: {
                        orderIndex: 'asc',
                    },
                },
                sessions: true,
            },
        });
        if (!room) {
            throw new common_1.NotFoundException(`Room with code ${normalizedCode} not found`);
        }
        return {
            id: room.id,
            code: room.code,
            title: room.title,
            status: room.status,
            currentQueueItemId: room.currentQueueItemId,
            queueLength: room.queueItems.length,
            guestCount: room.sessions.length,
        };
    }
    async verifyHost(code, hostToken) {
        const normalizedCode = code.trim().toUpperCase();
        const room = await this.prisma.room.findUnique({
            where: { code: normalizedCode },
        });
        if (!room) {
            throw new common_1.NotFoundException(`Room with code ${normalizedCode} not found`);
        }
        if (!hostToken || room.hostToken !== hostToken) {
            throw new common_1.UnauthorizedException('Invalid host credentials');
        }
        return true;
    }
};
exports.RoomsService = RoomsService;
exports.RoomsService = RoomsService = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [prisma_service_1.PrismaService])
], RoomsService);
//# sourceMappingURL=rooms.service.js.map