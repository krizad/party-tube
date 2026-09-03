import { Controller, Get, Query, BadRequestException } from '@nestjs/common';
import { YoutubeService } from './youtube.service';

@Controller('api/youtube')
export class YoutubeController {
  constructor(private readonly youtubeService: YoutubeService) {}

  @Get('search')
  async search(@Query('q') q: string) {
    if (!q || !q.trim()) {
      throw new BadRequestException('Search query parameter "q" is required');
    }
    return this.youtubeService.search(q);
  }

  @Get('suggestions')
  async getSuggestions(@Query('q') q: string) {
    if (!q || !q.trim()) {
      return { query: '', suggestions: [] };
    }
    const suggestions = await this.youtubeService.getSuggestions(q);
    return { query: q, suggestions };
  }

  @Get('recommendations')
  async getRecommendations(@Query('videoId') videoId: string) {
    if (!videoId) {
      throw new BadRequestException('videoId parameter is required');
    }
    const recommendations = await this.youtubeService.getRecommendations(videoId);
    return { videoId, results: recommendations };
  }
}
