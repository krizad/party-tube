export interface CreateRoomDto {
  title?: string;
}

export interface CreateRoomResponseDto {
  id: string;
  code: string;
  hostToken: string;
  title?: string;
}

export interface GetRoomResponseDto {
  id: string;
  code: string;
  title?: string;
  status: string;
  currentQueueItemId?: string | null;
  guestCount: number;
  queueLength: number;
}

export interface SearchResultItem {
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  duration: string;
  durationSeconds: number;
  url: string;
}

export interface SearchVideoResponseDto {
  query: string;
  results: SearchResultItem[];
  cached?: boolean;
}

export interface SearchSuggestionsResponseDto {
  query: string;
  suggestions: string[];
}

export interface PlaylistImportResponseDto {
  playlistId: string;
  title: string;
  itemCount: number;
  videos: SearchResultItem[];
}
