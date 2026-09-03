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
Object.defineProperty(exports, "__esModule", { value: true });
exports.QueueController = void 0;
const common_1 = require("@nestjs/common");
const queue_service_1 = require("./queue.service");
const rooms_service_1 = require("../rooms/rooms.service");
let QueueController = class QueueController {
    constructor(queueService, roomsService) {
        this.queueService = queueService;
        this.roomsService = roomsService;
    }
    async getQueue(code) {
        const room = await this.roomsService.getRoomByCode(code);
        return this.queueService.getQueue(room.id);
    }
    async getCurrent(code) {
        const room = await this.roomsService.getRoomByCode(code);
        return this.queueService.getCurrentTrack(room.id);
    }
    async getHistory(code) {
        const room = await this.roomsService.getRoomByCode(code);
        return this.queueService.getHistory(room.id);
    }
};
exports.QueueController = QueueController;
__decorate([
    (0, common_1.Get)(),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "getQueue", null);
__decorate([
    (0, common_1.Get)('current'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "getCurrent", null);
__decorate([
    (0, common_1.Get)('history'),
    __param(0, (0, common_1.Param)('code')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], QueueController.prototype, "getHistory", null);
exports.QueueController = QueueController = __decorate([
    (0, common_1.Controller)('api/rooms/:code/queue'),
    __metadata("design:paramtypes", [queue_service_1.QueueService,
        rooms_service_1.RoomsService])
], QueueController);
//# sourceMappingURL=queue.controller.js.map