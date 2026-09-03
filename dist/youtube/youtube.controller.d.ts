import { YoutubeService } from './youtube.service';
export declare class YoutubeController {
    private readonly youtubeService;
    constructor(youtubeService: YoutubeService);
    search(q: string): Promise<{
        query: string;
        results: import("@partytube/shared-types").SearchResultItem[];
        cached: boolean;
    }>;
    getSuggestions(q: string): Promise<{
        query: string;
        suggestions: string[];
    }>;
    getRecommendations(videoId: string): Promise<{
        videoId: string;
        results: import("@partytube/shared-types").SearchResultItem[];
    }>;
}
