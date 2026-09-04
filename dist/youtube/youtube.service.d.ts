import { OnModuleInit } from '@nestjs/common';
import { SearchResultItem } from '@partytube/shared-types';
export declare class YoutubeService implements OnModuleInit {
    private readonly logger;
    private innertube;
    private readonly cache;
    private readonly suggestionCache;
    constructor();
    onModuleInit(): Promise<void>;
    private getInnertubeClient;
    isYoutubeUrl(input: string): boolean;
    extractPlaylistId(input: string): string | null;
    extractVideoId(input: string): string | null;
    parseDurationToSeconds(duration: string | number | undefined): number;
    resolveVideoById(videoId: string): Promise<SearchResultItem[]>;
    search(query: string): Promise<{
        query: string;
        results: SearchResultItem[];
        cached: boolean;
    }>;
    private fetchGoogleSuggestions;
    getSuggestions(query: string): Promise<string[]>;
    getRecommendations(videoId: string): Promise<SearchResultItem[]>;
}
