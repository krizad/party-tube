'use client';

import { useEffect, useRef, useState, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  QueueItem,
  RoomMember,
  RoomState,
  AddQueueItemPayload,
} from '@partytube/shared-types';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

const WS_URL = process.env.NEXT_PUBLIC_WS_URL || 'http://localhost:3001';

interface UsePartySocketProps {
  roomCode: string;
  nickname: string;
  role: 'host' | 'guest';
  hostToken?: string;
  onTrackChange?: (track: QueueItem | null) => void;
  onSeekCommand?: (time: number) => void;
}

export function usePartySocket({
  roomCode,
  nickname,
  role,
  hostToken,
  onTrackChange,
  onSeekCommand,
}: UsePartySocketProps) {
  const { t } = useTranslation();
  const socketRef = useRef<Socket | null>(null);
  const [isConnected, setIsConnected] = useState(false);
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [queue, setQueue] = useState<QueueItem[]>([]);
  const [history, setHistory] = useState<QueueItem[]>([]);
  const [members, setMembers] = useState<RoomMember[]>([]);
  const [currentTrack, setCurrentTrack] = useState<QueueItem | null>(null);
  const [guestCount, setGuestCount] = useState<number>(1);
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);

  useEffect(() => {
    if (!roomCode || !nickname) return;

    const isLocal = typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1');
    const socket: Socket = io(WS_URL, {
      transports: isLocal ? ['websocket', 'polling'] : ['polling'],
      upgrade: isLocal,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);
      socket.emit('room:join', {
        roomCode,
        nickname,
        role,
        hostToken,
      });
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on('room:state', (state: RoomState) => {
      setRoomState(state);
      setQueue(state.queue || []);
      if (state.history) setHistory(state.history);
      if (state.members) setMembers(state.members);
      setCurrentTrack(state.currentTrack || null);
      setGuestCount(state.guestCount || 1);
      setIsPlaying(state.isPlaying);
      if (state.currentTrack?.durationSeconds) {
        setDuration(state.currentTrack.durationSeconds);
      }
    });

    socket.on('queue:updated', (updatedQueue: QueueItem[]) => {
      setQueue(updatedQueue);
    });

    socket.on('queue:history', (updatedHistory: QueueItem[]) => {
      setHistory(updatedHistory);
    });

    socket.on('room:members', (updatedMembers: RoomMember[]) => {
      setMembers(updatedMembers);
    });

    socket.on('track:now_playing', (data: { track: QueueItem | null; startedAt: number; isPlaying: boolean }) => {
      setCurrentTrack(data.track);
      setIsPlaying(data.isPlaying);
      setCurrentTime(0);
      if (data.track?.durationSeconds) {
        setDuration(data.track.durationSeconds);
      }
      if (onTrackChange) {
        onTrackChange(data.track);
      }
      if (data.track) {
        toast.info(`${t('nowPlaying')}: ${data.track.title}`);
      }
    });

    socket.on('toast:host_added', (data: { title: string }) => {
      toast.info(t('hostAddedToast', { title: data.title }));
    });

    socket.on('guest:joined', (data: { nickname: string; guestCount: number; members?: RoomMember[] }) => {
      setGuestCount(data.guestCount);
      if (data.members) setMembers(data.members);
      toast.success(t('joinedPartyToast', { nickname: data.nickname }));
    });

    socket.on('guest:left', (data: { nickname: string; guestCount: number; members?: RoomMember[] }) => {
      setGuestCount(data.guestCount);
      if (data.members) setMembers(data.members);
    });

    socket.on('player:time_sync', (data: { currentTime: number; duration: number }) => {
      setCurrentTime(data.currentTime);
      if (data.duration) setDuration(data.duration);
    });

    socket.on('player:seek_command', (data: { time: number; by?: string }) => {
      if (onSeekCommand) {
        onSeekCommand(data.time);
      }
    });

    socket.on('error:message', (err: { code: string; message: string }) => {
      toast.error(err.message || 'An error occurred');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, [roomCode, nickname, role, hostToken, onTrackChange, onSeekCommand, t]);

  const addToQueue = useCallback(
    (track: Omit<AddQueueItemPayload, 'roomCode'>) => {
      if (!socketRef.current) return;
      socketRef.current.emit('queue:add', {
        ...track,
        roomCode,
      });
      toast.success(t('songAddedToast', { title: track.title }));
    },
    [roomCode, t],
  );

  const removeFromQueue = useCallback(
    (queueItemId: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('queue:remove', {
        roomCode,
        queueItemId,
        hostToken,
        nickname,
      });
      toast.info(t('itemRemovedToast'));
    },
    [roomCode, hostToken, nickname, t],
  );

  const reorderQueue = useCallback(
    (sourceIndex: number, destinationIndex: number) => {
      if (!socketRef.current || !hostToken) return;
      socketRef.current.emit('queue:reorder', {
        roomCode,
        sourceIndex,
        destinationIndex,
        hostToken,
      });
    },
    [roomCode, hostToken],
  );

  const seekTrack = useCallback(
    (time: number) => {
      if (!socketRef.current) return;
      socketRef.current.emit('player:seek', {
        roomCode,
        time,
        by: nickname,
        hostToken,
      });
    },
    [roomCode, nickname, hostToken],
  );

  const sendTimeUpdate = useCallback(
    (time: number, totalDuration: number) => {
      if (!socketRef.current) return;
      socketRef.current.emit('player:time_update', {
        roomCode,
        currentTime: time,
        duration: totalDuration,
      });
    },
    [roomCode],
  );

  const notifyPlayerEnded = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('player:state_change', {
      roomCode,
      state: 'ended',
      currentTime: 0,
      hostToken,
    });
  }, [roomCode, hostToken]);

  const notifyPlaybackError = useCallback(
    (trackTitle?: string) => {
      if (!socketRef.current) return;
      socketRef.current.emit('player:playback_error', {
        roomCode,
        trackTitle,
      });
    },
    [roomCode],
  );

  const notifyPlayerState = useCallback(
    (state: 'playing' | 'paused', time: number) => {
      if (!socketRef.current) return;
      socketRef.current.emit('player:state_change', {
        roomCode,
        state,
        currentTime: time,
        hostToken,
      });
    },
    [roomCode, hostToken],
  );

  const skipTrack = useCallback(() => {
    if (!socketRef.current) return;
    socketRef.current.emit('player:skip', {
      roomCode,
      hostToken,
    });
    toast.info(t('skippingToast'));
  }, [roomCode, hostToken, t]);

  return {
    isConnected,
    roomState,
    queue,
    history,
    members,
    currentTrack,
    guestCount,
    isPlaying,
    currentTime,
    duration,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    seekTrack,
    sendTimeUpdate,
    notifyPlayerEnded,
    notifyPlaybackError,
    notifyPlayerState,
    skipTrack,
  };
}
