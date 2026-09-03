import { YoutubeService } from './youtube.service';

// Mock Innertube so unit tests run fast and isolated without network calls
jest.mock('youtubei.js', () => {
  return {
    Innertube: {
      create: jest.fn().mockResolvedValue({
        search: jest.fn(),
        getInfo: jest.fn(),
        getSearchSuggestions: jest.fn(),
      }),
    },
    UniversalCache: jest.fn(),
  };
});

describe('YoutubeService', () => {
  let service: YoutubeService;

  beforeEach(() => {
    service = new YoutubeService();
  });

  it('should identify YouTube URLs correctly', () => {
    expect(service.isYoutubeUrl('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(service.isYoutubeUrl('https://youtu.be/dQw4w9WgXcQ')).toBe(true);
    expect(service.isYoutubeUrl('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe(true);
    expect(service.isYoutubeUrl('https://music.youtube.com/watch?v=dQw4w9WgXcQ')).toBe(true);
    expect(service.isYoutubeUrl('https://www.youtube.com/playlist?list=PL12345')).toBe(true);
    expect(service.isYoutubeUrl('taylor swift style')).toBe(false);
  });

  it('should extract video ID correctly', () => {
    expect(service.extractVideoId('https://www.youtube.com/watch?v=dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(service.extractVideoId('https://youtu.be/dQw4w9WgXcQ?t=10')).toBe('dQw4w9WgXcQ');
    expect(service.extractVideoId('https://www.youtube.com/shorts/dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(service.extractVideoId('dQw4w9WgXcQ')).toBe('dQw4w9WgXcQ');
    expect(service.extractVideoId('invalid query text')).toBeNull();
  });

  it('should extract playlist ID correctly', () => {
    expect(
      service.extractPlaylistId('https://www.youtube.com/playlist?list=PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj'),
    ).toBe('PLMC9KNkIncKtPzgY-5rmhvj7fax8fdxoj');
  });

  it('should parse duration formatted strings to seconds', () => {
    expect(service.parseDurationToSeconds('3:45')).toBe(225);
    expect(service.parseDurationToSeconds('1:02:30')).toBe(3750);
    expect(service.parseDurationToSeconds('45')).toBe(45);
    expect(service.parseDurationToSeconds(180)).toBe(180);
  });
});
