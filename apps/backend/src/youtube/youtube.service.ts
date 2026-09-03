import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { Innertube, UniversalCache } from 'youtubei.js';
import { LRUCache } from 'lru-cache';
import { SearchResultItem } from '@partytube/shared-types';

@Injectable()
export class YoutubeService implements OnModuleInit {
  private readonly logger = new Logger(YoutubeService.name);
  private innertube: Innertube | null = null;
  private readonly cache: LRUCache<string, SearchResultItem[]>;
  private readonly suggestionCache: LRUCache<string, string[]>;

  constructor() {
    this.cache = new LRUCache<string, SearchResultItem[]>({
      max: 500,
      ttl: 1000 * 60 * 15, // 15 minutes TTL
    });
    this.suggestionCache = new LRUCache<string, string[]>({
      max: 500,
      ttl: 1000 * 60 * 30, // 30 minutes TTL
    });
  }

  async onModuleInit() {
    await this.getInnertubeClient();
  }

  private async getInnertubeClient(): Promise<Innertube> {
    if (this.innertube) return this.innertube;

    try {
      this.innertube = await Innertube.create({
        cache: new UniversalCache(false),
        generate_session_locally: true,
        location: 'TH',
        lang: 'th',
      });
      this.logger.log('🎉 YouTube InnerTube (youtubei.js) client initialized successfully!');
      return this.innertube;
    } catch (err: any) {
      this.logger.error(`Error initializing Innertube: ${err.message}`);
      throw err;
    }
  }

  isYoutubeUrl(input: string): boolean {
    const trimmed = input.trim();
    return (
      trimmed.includes('youtube.com/watch') ||
      trimmed.includes('youtu.be/') ||
      trimmed.includes('youtube.com/shorts/') ||
      trimmed.includes('music.youtube.com/watch') ||
      trimmed.includes('youtube.com/playlist')
    );
  }

  extractPlaylistId(input: string): string | null {
    const match = input.match(/[?&]list=([a-zA-Z0-9_-]+)/);
    return match ? match[1] : null;
  }

  extractVideoId(input: string): string | null {
    const trimmed = input.trim();
    const shortMatch = trimmed.match(/youtu\.be\/([a-zA-Z0-9_-]{11})/);
    if (shortMatch) return shortMatch[1];

    const watchMatch = trimmed.match(/[?&]v=([a-zA-Z0-9_-]{11})/);
    if (watchMatch) return watchMatch[1];

    const shortsMatch = trimmed.match(/youtube\.com\/shorts\/([a-zA-Z0-9_-]{11})/);
    if (shortsMatch) return shortsMatch[1];

    if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
      return trimmed;
    }

    return null;
  }

  parseDurationToSeconds(duration: string | number | undefined): number {
    if (typeof duration === 'number') {
      return Math.floor(duration);
    }
    if (!duration || typeof duration !== 'string') {
      return 0;
    }

    const parts = duration.split(':').map((p) => parseInt(p, 10));
    if (parts.some((p) => isNaN(p))) return 0;

    if (parts.length === 3) {
      return parts[0] * 3600 + parts[1] * 60 + parts[2];
    } else if (parts.length === 2) {
      return parts[0] * 60 + parts[1];
    } else if (parts.length === 1) {
      return parts[0];
    }
    return 0;
  }

  async resolveVideoById(videoId: string): Promise<SearchResultItem[]> {
    const cached = this.cache.get(`video:${videoId}`);
    if (cached) return cached;

    try {
      const yt = await this.getInnertubeClient();
      const info = await yt.getInfo(videoId);
      const basicInfo = info.basic_info;

      const item: SearchResultItem = {
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
    } catch (err: any) {
      this.logger.warn(`Could not resolve video metadata for ${videoId}: ${err.message}. Using fallback.`);
      const fallbackItem: SearchResultItem = {
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

  async search(query: string): Promise<{ query: string; results: SearchResultItem[]; cached: boolean }> {
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
      
      // Prioritize direct search results to avoid extraneous shelf/promoted/sidebar videos
      let rawVideos: any[] = [];
      if (searchResponse.results && searchResponse.results.length > 0) {
        rawVideos = searchResponse.results.filter((item: any) =>
          item.type === 'Video' || item.type === 'CompactVideo' || item.type === 'GridVideo'
        );
      }
      if (rawVideos.length === 0 && searchResponse.videos) {
        rawVideos = searchResponse.videos;
      }

      const formattedResults: SearchResultItem[] = rawVideos.map((video: any) => {
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
      }).filter((v: SearchResultItem) => Boolean(v.videoId));

      this.cache.set(cacheKey, formattedResults);
      return { query: trimmedQuery, results: formattedResults, cached: false };
    } catch (err: any) {
      this.logger.error(`YouTube search error for "${trimmedQuery}": ${err.message}`);
      return { query: trimmedQuery, results: [], cached: false };
    }
  }

  async getSuggestions(query: string): Promise<string[]> {
    const trimmed = query.trim().toLowerCase();
    if (!trimmed) return [];

    const cached = this.suggestionCache.get(trimmed);
    if (cached) return cached;

    try {
      const yt = await this.getInnertubeClient();
      const suggestions = await yt.getSearchSuggestions(trimmed);
      this.suggestionCache.set(trimmed, suggestions);
      return suggestions;
    } catch (err: any) {
      this.logger.warn(`Could not fetch suggestions for "${trimmed}": ${err.message}`);
      return [];
    }
  }

  async getRecommendations(videoId: string): Promise<SearchResultItem[]> {
    try {
      const yt = await this.getInnertubeClient();
      const info = await yt.getInfo(videoId);
      const watchNext = info.watch_next_feed || [];

      const recommendations: SearchResultItem[] = [];

      for (const item of watchNext as any[]) {
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
        if (recommendations.length >= 6) break;
      }

      return recommendations;
    } catch (err: any) {
      this.logger.warn(`Could not get recommendations for video ${videoId}: ${err.message}`);
      return [];
    }
  }
}
