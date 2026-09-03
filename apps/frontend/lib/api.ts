import {
  CreateRoomResponseDto,
  GetRoomResponseDto,
  SearchVideoResponseDto,
  SearchSuggestionsResponseDto,
} from '@partytube/shared-types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export async function createRoom(title?: string): Promise<CreateRoomResponseDto> {
  const res = await fetch(`${API_BASE_URL}/api/rooms`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ title }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create room' }));
    throw new Error(error.message || 'Failed to create room');
  }

  return res.json();
}

export async function getRoom(code: string): Promise<GetRoomResponseDto> {
  const res = await fetch(`${API_BASE_URL}/api/rooms/${code}`);
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Room not found' }));
    throw new Error(error.message || 'Room not found');
  }
  return res.json();
}

export async function searchYouTube(query: string, signal?: AbortSignal): Promise<SearchVideoResponseDto> {
  const res = await fetch(`${API_BASE_URL}/api/youtube/search?q=${encodeURIComponent(query)}`, { signal });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Search failed' }));
    throw new Error(error.message || 'Search failed');
  }
  return res.json();
}

export async function getSearchSuggestions(query: string, signal?: AbortSignal): Promise<string[]> {
  if (!query || !query.trim()) return [];
  try {
    const res = await fetch(`${API_BASE_URL}/api/youtube/suggestions?q=${encodeURIComponent(query)}`, { signal });
    if (!res.ok) return [];
    const data: SearchSuggestionsResponseDto = await res.json();
    return data.suggestions || [];
  } catch {
    return [];
  }
}
