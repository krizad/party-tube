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
exports.YoutubeController = void 0;
const common_1 = require("@nestjs/common");
const youtube_service_1 = require("./youtube.service");
let YoutubeController = class YoutubeController {
    constructor(youtubeService) {
        this.youtubeService = youtubeService;
    }
    async search(q) {
        if (!q || !q.trim()) {
            throw new common_1.BadRequestException('Search query parameter "q" is required');
        }
        return this.youtubeService.search(q);
    }
    async getSuggestions(q) {
        if (!q || !q.trim()) {
            return { query: '', suggestions: [] };
        }
        const suggestions = await this.youtubeService.getSuggestions(q);
        return { query: q, suggestions };
    }
    async getRecommendations(videoId) {
        if (!videoId) {
            throw new common_1.BadRequestException('videoId parameter is required');
        }
        const recommendations = await this.youtubeService.getRecommendations(videoId);
        return { videoId, results: recommendations };
    }
};
exports.YoutubeController = YoutubeController;
__decorate([
    (0, common_1.Get)('search'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], YoutubeController.prototype, "search", null);
__decorate([
    (0, common_1.Get)('suggestions'),
    __param(0, (0, common_1.Query)('q')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], YoutubeController.prototype, "getSuggestions", null);
__decorate([
    (0, common_1.Get)('recommendations'),
    __param(0, (0, common_1.Query)('videoId')),
    __metadata("design:type", Function),
    __metadata("design:paramtypes", [String]),
    __metadata("design:returntype", Promise)
], YoutubeController.prototype, "getRecommendations", null);
exports.YoutubeController = YoutubeController = __decorate([
    (0, common_1.Controller)('api/youtube'),
    __metadata("design:paramtypes", [youtube_service_1.YoutubeService])
], YoutubeController);
//# sourceMappingURL=youtube.controller.js.map