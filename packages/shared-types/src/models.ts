export type RoomStatus = 'ACTIVE' | 'INACTIVE' | 'CLOSED';
export type QueueStatus = 'PENDING' | 'PLAYING' | 'PLAYED' | 'SKIPPED';
export type ParticipantRole = 'host' | 'guest';

export interface RoomMember {
  socketId: string;
  nickname: string;
  role: ParticipantRole;
  isHost: boolean;
  joinedAt: number;
}

export interface Room {
  id: string;
  code: string;
  hostToken: string;
  title?: string | null;
  status: string;
  currentQueueItemId?: string | null;
  createdAt: Date | string;
  updatedAt: Date | string;
  queueItems?: QueueItem[];
  sessions?: GuestSession[];
}

export interface QueueItem {
  id: string;
  roomId: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  durationSeconds: number;
  addedBy: string;
  status: QueueStatus;
  orderIndex: number;
  playedAt?: Date | string | null;
  createdAt: Date | string;
}

export interface GuestSession {
  id: string;
  roomId: string;
  socketId: string;
  nickname: string;
  ipHash: string;
  joinedAt: Date | string;
  lastActiveAt: Date | string;
}

export interface TrackItem {
  id?: string;
  videoId: string;
  title: string;
  thumbnailUrl: string;
  channelTitle: string;
  durationSeconds: number;
  durationFormatted?: string;
  addedBy?: string;
}

export interface RoomState {
  roomId: string;
  roomCode: string;
  title?: string;
  currentTrack: QueueItem | null;
  queue: QueueItem[];
  history?: QueueItem[];
  members?: RoomMember[];
  guestCount: number;
  isPlaying: boolean;
  status: string;
}
