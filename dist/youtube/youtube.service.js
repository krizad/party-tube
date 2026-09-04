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
var YoutubeService_1;
Object.defineProperty(exports, "__esModule", { value: true });
exports.YoutubeService = void 0;
const common_1 = require("@nestjs/common");
const youtubei_js_1 = require("youtubei.js");
const lru_cache_1 = require("lru-cache");
const https = require("node:https");
let YoutubeService = YoutubeService_1 = class YoutubeService {
    constructor() {
        this.logger = new common_1.Logger(YoutubeService_1.name);
        this.innertube = null;
        this.cache = new lru_cache_1.LRUCache({
            max: 500,
            ttl: 1000 * 60 * 15,
        });
        this.suggestionCache = new lru_cache_1.LRUCache({
            max: 500,
            ttl: 1000 * 60 * 30,
        });
    }
    async onModuleInit() {
        await this.getInnertubeClient();
    }
    async getInnertubeClient() {
        if (this.innertube)
            return this.innertube;
        try {
            this.innertube = await youtubei_js_1.Innertube.create({
                cache: new youtubei_js_1.UniversalCache(false),
                generate_session_locally: true,
                location: 'TH',
                lang: 'th',
            });
            this.logger.log('🎉 YouTube InnerTube (youtubei.js) client initialized successfully!');
            return this.innertube;
        }
        catch (err) {
            this.logger.error(`Error initializing Innertube: ${err.message}`);
            throw err;
        }
    }
    isYoutubeUrl(input) {
        const trimmed = input.trim();
        return (trimmed.includes('youtube.com/watch') ||
            trimmed.includes('youtu.be/') ||
            trimmed.includes('youtube.com/shorts/') ||
            trimmed.includes('music.youtube.com/watch') ||
            trimmed.includes('youtube.com/playlist'));
    }
    extractPlaylistId(input) {
        const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
        return match ? match[1] : null;
    }
    extractVideoId(input) {
        const trimmed = input.trim();
        const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
        if (shortMatch)
            return shortMatch[1];
        const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
        if (watchMatch)
            return watchMatch[1];
        const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
        if (shortsMatch)
            return shortsMatch[1];
        if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
            return trimmed;
        }
        return null;
    }
    parseDurationToSeconds(duration) {
        if (typeof duration === 'number') {
            return Math.floor(duration);
        }
        if (!duration || typeof duration !== 'string') {
            return 0;
        }
        const parts = duration.split(':').map((p) => parseInt(p, 10));
        if (parts.some((p) => isNaN(p)))
            return 0;
        if (parts.length === 3) {
            return parts[0] * 3600 + parts[1] * 60 + parts[2];
        }
        else if (parts.length === 2) {
            return parts[0] * 60 + parts[1];
        }
        else if (parts.length === 1) {
            return parts[0];
        }
        return 0;
    }
    async resolveVideoById(videoId) {
        const cached = this.cache.get(`video:${videoId}`);
        if (cached)
            return cached;
        try {
            const yt = await this.getInnertubeClient();
            const info = await yt.getInfo(videoId);
            const basicInfo = info.basic_info;
            const item = {
                videoId: videoId,
                title: basicInfo.title || 'Untitled Video',
                thumbnailUrl: basicInfo.thumbnail?.[0]?.url || `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                channelTitle: basicInfo.author || 'YouTube Channel',
                duration: basicInfo.duration ? `${Math.floor(basicInfo.duration / 60)}:${(basicInfo.duration % 60).toString().padStart(2, '0')}` : '0:00',
                durationSeconds: basicInfo.duration || 0,
                url: `https://www.youtube.com/watch?v=${videoId}`,
            };
            const result = [item];
            this.cache.set(`video:${videoId}`, result);
            return result;
        }
        catch (err) {
            this.logger.warn(`Could not resolve video metadata for ${videoId}: ${err.message}. Using fallback.`);
            const fallbackItem = {
                videoId: videoId,
                title: `YouTube Video (${videoId})`,
                thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
                channelTitle: 'YouTube',
                duration: '3:30',
                durationSeconds: 210,
                url: `https://www.youtube.com/watch?v=${videoId}`,
            };
            return [fallbackItem];
        }
    }
    async search(query) {
        const trimmedQuery = query.trim();
        if (!trimmedQuery) {
            return { query: '', results: [], cached: false };
        }
        if (this.isYoutubeUrl(trimmedQuery) || /^[a-zA-Z0-9_-]{11}$/.test(trimmedQuery)) {
            const videoId = this.extractVideoId(trimmedQuery);
            if (videoId) {
                const results = await this.resolveVideoById(videoId);
                return { query: trimmedQuery, results, cached: false };
            }
        }
        const cacheKey = `search:${trimmedQuery.toLowerCase()}`;
        const cached = this.cache.get(cacheKey);
        if (cached) {
            return { query: trimmedQuery, results: cached, cached: true };
        }
        try {
            const yt = await this.getInnertubeClient();
            const searchResponse = await yt.search(trimmedQuery, { type: 'video' });
            let rawVideos = [];
            if (searchResponse.results && searchResponse.results.length > 0) {
                rawVideos = searchResponse.results.filter((item) => item.type === 'Video' || item.type === 'CompactVideo' || item.type === 'GridVideo');
            }
            if (rawVideos.length === 0 && searchResponse.videos) {
                rawVideos = searchResponse.videos;
            }
            const formattedResults = rawVideos.map((video) => {
                const title = typeof video.title === 'object' ? video.title?.text || '' : String(video.title || '');
                const channel = typeof video.author === 'object' ? video.author?.name || '' : String(video.author || '');
                const durationText = typeof video.duration === 'object' ? video.duration?.text || '' : String(video.duration || '');
                const durationSec = typeof video.duration === 'object' && video.duration?.seconds ? video.duration.seconds : this.parseDurationToSeconds(durationText);
                const thumbUrl = video.thumbnails?.[0]?.url || (video.id ? `https://i.ytimg.com/vi/${video.id}/hqdefault.jpg` : '');
                return {
                    videoId: video.id || '',
                    title: title || 'Untitled',
                    thumbnailUrl: thumbUrl,
                    channelTitle: channel || 'Unknown Artist',
                    duration: durationText || '0:00',
                    durationSeconds: durationSec,
                    url: `https://www.youtube.com/watch?v=${video.id}`,
                };
            }).filter((v) => Boolean(v.videoId));
            this.cache.set(cacheKey, formattedResults);
            return { query: trimmedQuery, results: formattedResults, cached: false };
        }
        catch (err) {
            this.logger.error(`YouTube search error for "${trimmedQuery}": ${err.message}`);
            return { query: trimmedQuery, results: [], cached: false };
        }
    }
    async fetchGoogleSuggestions(query) {
        const q = encodeURIComponent(query.trim());
        const url = `https://suggestqueries-clients6.youtube.com/complete/search?client=youtube&hl=th&gl=th&ds=yt&oe=utf-8&ie=utf-8&q=${q}`;
        return new Promise((resolve) => {
            https
                .get(url, (res) => {
                const chunks = [];
                res.on('data', (c) => chunks.push(c));
                res.on('end', () => {
                    try {
                        const raw = Buffer.concat(chunks).toString('utf-8');
                        const match = raw.match(/window\.google\.ac\.h\((.*)\)/);
                        if (match && match[1]) {
                            const parsed = JSON.parse(match[1]);
                            const items = (parsed[1] || []).map((row) => row[0]).filter(Boolean);
                            resolve(items);
                        }
                        else {
                            resolve([]);
                        }
                    }
                    catch {
                        resolve([]);
                    }
                });
            })
                .on('error', () => resolve([]));
        });
    }
    async getSuggestions(query) {
        const rawQuery = query.trim();
        if (!rawQuery)
            return [];
        const cacheKey = rawQuery.toLowerCase();
        const cached = this.suggestionCache.get(cacheKey);
        if (cached)
            return cached;
        try {
            const raw = await this.fetchGoogleSuggestions(rawQuery);
            const musicKeywords = [
                'เพลง',
                'คาราโอเกะ',
                'karaoke',
                'mv',
                'cover',
                'lyrics',
                'เนื้อเพลง',
                'official',
                'audio',
                'คอร์ด',
                'คอนเสิร์ต',
                'concert',
            ];
            const musicMatches = [];
            const otherMatches = [];
            for (const item of raw) {
                const lower = item.toLowerCase();
                if (musicKeywords.some((k) => lower.includes(k))) {
                    musicMatches.push(item);
                }
                else {
                    otherMatches.push(item);
                }
            }
            const smartMusicPills = [];
            if (!rawQuery.startsWith('เพลง') && !rawQuery.startsWith('music')) {
                smartMusicPills.push(`เพลง ${rawQuery}`);
            }
            if (!rawQuery.includes('คาราโอเกะ') && !rawQuery.includes('karaoke')) {
                smartMusicPills.push(`${rawQuery} คาราโอเกะ`);
            }
            const set = new Set();
            const finalSuggestions = [];
            for (const item of [...smartMusicPills, ...musicMatches, ...otherMatches]) {
                const normalized = item.trim();
                if (!set.has(normalized.toLowerCase()) && normalized.toLowerCase() !== rawQuery.toLowerCase()) {
                    set.add(normalized.toLowerCase());
                    finalSuggestions.push(normalized);
                }
            }
            const results = finalSuggestions.slice(0, 8);
            this.suggestionCache.set(cacheKey, results);
            return results;
        }
        catch (err) {
            this.logger.warn(`Could not fetch suggestions for "${rawQuery}": ${err.message}`);
            return [];
        }
    }
    async getRecommendations(videoId) {
        try {
            const yt = await this.getInnertubeClient();
            const info = await yt.getInfo(videoId);
            const watchNext = info.watch_next_feed || [];
            const recommendations = [];
            for (const item of watchNext) {
                const id = item.id || item.content_id;
                const title = item.title?.text || item.metadata?.title?.text || '';
                const channel = item.author?.name || item.metadata?.image?.a11y_label?.replace(/^Go to channel\s+/, '') || 'YouTube Artist';
                const thumb = item.thumbnails?.[0]?.url || (id ? `https://i.ytimg.com/vi/${id}/hqdefault.jpg` : '');
                if (id && title) {
                    recommendations.push({
                        videoId: id,
                        title,
                        thumbnailUrl: thumb,
                        channelTitle: channel,
                        duration: '3:30',
                        durationSeconds: 210,
                        url: `https://www.youtube.com/watch?v=${id}`,
                    });
                }
                if (recommendations.length >= 6)
                    break;
            }
            return recommendations;
        }
        catch (err) {
            this.logger.warn(`Could not get recommendations for video ${videoId}: ${err.message}`);
            return [];
        }
    }
};
exports.YoutubeService = YoutubeService;
exports.YoutubeService = YoutubeService = YoutubeService_1 = __decorate([
    (0, common_1.Injectable)(),
    __metadata("design:paramtypes", [])
], YoutubeService);
//# sourceMappingURL=youtube.service.js.map