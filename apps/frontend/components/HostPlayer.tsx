'use client';

import React, { useEffect, useRef, useState, useCallback } from 'react';
import { QueueItem } from '@partytube/shared-types';
import { Play, Pause, SkipForward, Volume2, VolumeX, Maximize2, Music } from 'lucide-react';
import { AudioVisualizer } from './AudioVisualizer';
import { formatDuration } from '@/lib/utils';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: () => void;
  }
}

interface HostPlayerProps {
  currentTrack: QueueItem | null;
  onEnded: () => void;
  onSkip: () => void;
  onError?: (trackTitle?: string) => void;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  seekTime?: number | null;
  roomCode: string;
}

export const HostPlayer: React.FC<HostPlayerProps> = ({
  currentTrack,
  onEnded,
  onSkip,
  onError,
  onTimeUpdate,
  seekTime,
  roomCode,
}) => {
  const { t } = useTranslation();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(80);
  const [isApiReady, setIsApiReady] = useState(false);

  // Playback timeline states
  const [currentTime, setCurrentTime] = useState<number>(0);
  const [duration, setDuration] = useState<number>(0);
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubValue, setScrubValue] = useState<number>(0);

  // YouTube IFrame API Script loader
  useEffect(() => {
    if (typeof window === 'undefined') return;

    if (window.YT && window.YT.Player) {
      setIsApiReady(true);
      return;
    }

    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);

    window.onYouTubeIframeAPIReady = () => {
      setIsApiReady(true);
    };
  }, []);

  // Listen to remote seek requests (e.g. from Guest or Host socket)
  useEffect(() => {
    if (seekTime !== null && seekTime !== undefined && playerRef.current?.seekTo) {
      playerRef.current.seekTo(seekTime, true);
      setCurrentTime(seekTime);
    }
  }, [seekTime]);

  // Periodic time polling while playing
  useEffect(() => {
    if (!isPlaying || isScrubbing) return;

    const interval = setInterval(() => {
      if (playerRef.current && playerRef.current.getCurrentTime) {
        const cur = Math.floor(playerRef.current.getCurrentTime() || 0);
        const dur = Math.floor(playerRef.current.getDuration() || currentTrack?.durationSeconds || 0);
        setCurrentTime(cur);
        setDuration(dur);
        if (onTimeUpdate) {
          onTimeUpdate(cur, dur);
        }
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isPlaying, isScrubbing, currentTrack, onTimeUpdate]);

  // YouTube Player Initialization
  useEffect(() => {
    if (!isApiReady || !containerRef.current) return;

    if (!currentTrack) {
      if (playerRef.current) {
        playerRef.current.stopVideo?.();
      }
      setIsPlaying(false);
      setCurrentTime(0);
      setDuration(0);
      return;
    }

    if (!playerRef.current) {
      playerRef.current = new window.YT.Player('youtube-player-iframe', {
        height: '100%',
        width: '100%',
        videoId: currentTrack.videoId,
        playerVars: {
          autoplay: 1,
          controls: 0,
          modestbranding: 1,
          rel: 0,
          showinfo: 0,
          iv_load_policy: 3,
          enablejsapi: 1,
          origin: window.location.origin,
        },
        events: {
          onReady: (event: any) => {
            event.target.setVolume(volume);
            event.target.playVideo();
            setIsPlaying(true);
            const dur = Math.floor(event.target.getDuration() || currentTrack.durationSeconds || 0);
            setDuration(dur);
          },
          onStateChange: (event: any) => {
            if (event.data === 0) {
              setIsPlaying(false);
              onEnded();
            } else if (event.data === 1) {
              setIsPlaying(true);
              const dur = Math.floor(event.target.getDuration() || currentTrack.durationSeconds || 0);
              setDuration(dur);
            } else if (event.data === 2) {
              setIsPlaying(false);
            }
          },
          onError: (_event: any) => {
            toast.error(t('unembeddableToast'));
            if (onError) {
              onError(currentTrack.title);
            } else {
              onSkip();
            }
          },
        },
      });
    } else {
      try {
        playerRef.current.loadVideoById(currentTrack.videoId);
        setIsPlaying(true);
        setCurrentTime(0);
      } catch (err) {
        console.error('Error loading video by ID:', err);
      }
    }
  }, [currentTrack, isApiReady, onEnded, onSkip, onError, volume, t]);

  const togglePlayPause = () => {
    if (!playerRef.current) return;
    if (isPlaying) {
      playerRef.current.pauseVideo();
      setIsPlaying(false);
    } else {
      playerRef.current.playVideo();
      setIsPlaying(true);
    }
  };

  const toggleMute = () => {
    if (!playerRef.current) return;
    if (isMuted) {
      playerRef.current.unMute();
      setIsMuted(false);
    } else {
      playerRef.current.mute();
      setIsMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVol = parseInt(e.target.value, 10);
    setVolume(newVol);
    if (playerRef.current) {
      playerRef.current.setVolume(newVol);
      if (newVol > 0 && isMuted) {
        playerRef.current.unMute();
        setIsMuted(false);
      }
    }
  };

  const toggleFullscreen = () => {
    if (!containerRef.current) return;
    if (!document.fullscreenElement) {
      containerRef.current.requestFullscreen?.();
    } else {
      document.exitFullscreen?.();
    }
  };

  // Scrubber Handlers (Seeking)
  const handleScrubChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    setIsScrubbing(true);
    setScrubValue(val);
  };

  const handleScrubCommit = () => {
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(scrubValue, true);
      setCurrentTime(scrubValue);
      if (onTimeUpdate) {
        onTimeUpdate(scrubValue, duration);
      }
    }
    setIsScrubbing(false);
  };

  const currentDisplayTime = isScrubbing ? scrubValue : currentTime;
  const progressPercent = duration > 0 ? (currentDisplayTime / duration) * 100 : 0;

  return (
    <div
      ref={containerRef}
      className="relative flex flex-col w-full aspect-video max-h-[70vh] bg-black rounded-2xl overflow-hidden border border-party-glowBorder shadow-xl group"
    >
      <div className="w-full h-full relative">
        <div id="youtube-player-iframe" className="w-full h-full" />

        {!currentTrack && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-gradient-to-br from-party-card via-party-dark to-black text-center p-8">
            <div className="w-16 h-16 rounded-2xl bg-purple-500/15 border border-purple-500/30 flex items-center justify-center text-party-neonPurple mb-4">
              <Music className="w-8 h-8" />
            </div>
            <h2 className="text-xl sm:text-2xl font-bold text-white mb-2">
              {t('waitingTitle')}
            </h2>
            <p className="text-gray-400 max-w-md text-xs sm:text-sm mb-5">
              {t('waitingDesc')}
            </p>
            <div className="flex items-center gap-2 px-3.5 py-1.5 rounded-xl bg-party-card border border-party-glowBorder text-party-neonCyan font-mono font-semibold text-xs">
              <span>{t('roomCodeLabel')}:</span>
              <span className="text-white tracking-wider">{roomCode}</span>
            </div>
          </div>
        )}
      </div>

      {currentTrack && (
        <div className="absolute top-0 inset-x-0 p-4 sm:p-5 bg-gradient-to-b from-black/85 via-black/40 to-transparent flex items-start justify-between z-10 opacity-0 group-hover:opacity-100 transition-opacity duration-200">
          <div className="flex items-center gap-3">
            <AudioVisualizer isPlaying={isPlaying} />
            <div>
              <span className="text-[11px] font-semibold uppercase tracking-wider text-party-neonCyan">{t('nowPlaying')}</span>
              <h3 className="text-base sm:text-lg font-bold text-white line-clamp-1">
                {currentTrack.title}
              </h3>
              <p className="text-xs text-gray-300 flex items-center gap-2">
                <span>{currentTrack.channelTitle}</span>
                <span>•</span>
                <span className="text-purple-300">{t('addedBy')} {currentTrack.addedBy}</span>
              </p>
            </div>
          </div>
        </div>
      )}

      {currentTrack && (
        <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/95 via-black/70 to-transparent p-4 flex flex-col gap-2 z-10 opacity-90 group-hover:opacity-100 transition-opacity">
          {/* YouTube-style Timeline Scrubber Bar */}
          <div className="flex items-center gap-3 w-full">
            <span className="text-[11px] font-mono font-medium text-gray-300 min-w-[32px]">
              {formatDuration(currentDisplayTime)}
            </span>

            <div className="relative flex-1 flex items-center group/scrubber cursor-pointer">
              {/* Visual Track */}
              <div className="w-full h-1.5 group-hover/scrubber:h-2 bg-gray-700/70 rounded-full overflow-hidden transition-all relative">
                <div
                  className="h-full bg-gradient-to-r from-party-neonPurple to-party-neonPink rounded-full transition-all"
                  style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                />
              </div>

              {/* Native Range Input for Smooth Drag & Click Seeking */}
              <input
                type="range"
                min={0}
                max={duration || 100}
                value={currentDisplayTime}
                onChange={handleScrubChange}
                onMouseUp={handleScrubCommit}
                onTouchEnd={handleScrubCommit}
                className="absolute inset-0 w-full opacity-0 cursor-pointer"
              />
            </div>

            <span className="text-[11px] font-mono font-medium text-gray-400 min-w-[32px]">
              {formatDuration(duration)}
            </span>
          </div>

          {/* Player Bottom Controls */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <button
                onClick={togglePlayPause}
                className="p-2.5 rounded-full bg-party-neonPurple text-white hover:bg-purple-600 active:scale-95 transition-all shadow-md shadow-party-neonPurple/30"
                title={isPlaying ? 'Pause' : 'Play'}
              >
                {isPlaying ? <Pause className="h-4 w-4 fill-current" /> : <Play className="h-4 w-4 fill-current ml-0.5" />}
              </button>

              <button
                onClick={onSkip}
                className="p-2 rounded-full bg-party-cardHover hover:bg-gray-700 text-gray-200 hover:text-white border border-party-glowBorder transition-colors"
                title="Skip Track"
              >
                <SkipForward className="h-4 w-4" />
              </button>
            </div>

            <div className="flex items-center gap-3.5">
              <div className="flex items-center gap-2">
                <button onClick={toggleMute} className="text-gray-300 hover:text-white transition">
                  {isMuted || volume === 0 ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                </button>
                <input
                  type="range"
                  min="0"
                  max="100"
                  value={isMuted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className="w-20 sm:w-24 accent-party-neonPurple cursor-pointer h-1.5 bg-gray-700 rounded-lg"
                />
              </div>

              <button
                onClick={toggleFullscreen}
                className="p-1.5 text-gray-300 hover:text-white rounded-lg hover:bg-party-cardHover transition"
                title="Fullscreen"
              >
                <Maximize2 className="h-4 w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
