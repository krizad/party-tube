'use client';

import React, { useState } from 'react';
import { QueueItem } from '@partytube/shared-types';
import { formatDuration } from '@/lib/utils';
import { Music2, Trash2, ArrowUp, ArrowDown, RotateCcw, Crown, History } from 'lucide-react';
import Image from 'next/image';
import { useTranslation } from '@/lib/i18n';

interface LiveQueueProps {
  queue: QueueItem[];
  history?: QueueItem[];
  currentTrack: QueueItem | null;
  isHost?: boolean;
  userNickname?: string;
  onRemove?: (id: string) => void;
  onReorder?: (sourceIndex: number, destinationIndex: number) => void;
  onRequeue?: (item: QueueItem) => void;
}

export const LiveQueue: React.FC<LiveQueueProps> = ({
  queue,
  history = [],
  currentTrack,
  isHost = false,
  userNickname,
  onRemove,
  onReorder,
  onRequeue,
}) => {
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState<'queue' | 'history'>('queue');

  return (
    <div className="flex flex-col h-full bg-party-card rounded-2xl border border-party-glowBorder overflow-hidden">
      {/* Queue & History Tabs */}
      <div className="px-3 pt-3 pb-2 border-b border-party-glowBorder flex items-center justify-between bg-party-card gap-2">
        <div className="flex items-center gap-1.5 p-0.5 rounded-xl bg-party-cardHover border border-party-glowBorder/60 text-xs">
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-party-neonPurple text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music2 className="h-3.5 w-3.5" />
            <span>{t('queueTab')}</span>
            <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
              {queue.length}
            </span>
          </button>

          <button
            onClick={() => setActiveTab('history')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-semibold transition-all ${
              activeTab === 'history'
                ? 'bg-party-neonPurple text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <History className="h-3.5 w-3.5" />
            <span>{t('historyTab')}</span>
            {history.length > 0 && (
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/30">
                {history.length}
              </span>
            )}
          </button>
        </div>

        {activeTab === 'queue' ? (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-party-neonPurple/15 text-party-neonPurple border border-party-neonPurple/25">
            {t('upNext')} {queue.length} {t('songsUnit')}
          </span>
        ) : (
          <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-cyan-500/15 text-party-neonCyan border border-cyan-500/25">
            {history.length} {t('songsUnit')}
          </span>
        )}
      </div>

      <div className="flex-1 overflow-y-auto p-3.5 space-y-3 max-h-[600px] scrollbar-thin">
        {/* Active Queue Tab */}
        {activeTab === 'queue' ? (
          <>
            {/* Currently Playing Card */}
            {currentTrack && (
              <div className="p-3 rounded-xl bg-purple-950/20 border border-party-neonPurple/40">
                <div className="text-[10px] font-semibold text-party-neonPink uppercase tracking-wider mb-1.5">
                  {t('nowPlaying')}
                </div>
                <div className="flex gap-2.5 items-center">
                  <div className="relative w-14 h-10 flex-shrink-0 rounded-md overflow-hidden bg-black">
                    {currentTrack.thumbnailUrl ? (
                      <Image
                        src={currentTrack.thumbnailUrl}
                        alt={currentTrack.title}
                        fill
                        className="object-cover"
                        unoptimized
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                        <Music2 className="h-4 w-4" />
                      </div>
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <h4 className="text-xs font-semibold text-white line-clamp-1">{currentTrack.title}</h4>
                    <p className="text-[11px] text-gray-400 truncate">{currentTrack.channelTitle}</p>
                    <div className="flex items-center gap-2 mt-0.5 text-[10px] text-gray-300">
                      <span className="text-party-neonCyan">{formatDuration(currentTrack.durationSeconds)}</span>
                      <span>•</span>
                      {currentTrack.addedBy?.toLowerCase().includes('host') ? (
                        <span className="flex items-center gap-1 text-amber-400 font-semibold">
                          <Crown className="h-3 w-3" /> Host
                        </span>
                      ) : (
                        <span className="text-purple-300">{currentTrack.addedBy}</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Up Next List */}
            {queue.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-gray-400">
                <p className="text-xs font-medium text-gray-300">{t('queueEmpty')}</p>
                <p className="text-[11px] text-gray-500 mt-1">{t('queueEmptyDesc')}</p>
              </div>
            ) : (
              <div className="space-y-1.5">
                {queue.map((item, index) => {
                  const canDelete = isHost || (userNickname && item.addedBy === userNickname);
                  const isItemFromHost = item.addedBy?.toLowerCase().includes('host');

                  return (
                    <div
                      key={item.id || index}
                      className="flex items-center gap-2.5 p-2 rounded-xl bg-party-cardHover/40 hover:bg-party-cardHover border border-party-glowBorder/50 transition-all group"
                    >
                      <span className="text-[11px] font-medium text-gray-500 w-3.5 text-center">
                        {index + 1}
                      </span>

                      <div className="relative w-12 h-8 flex-shrink-0 rounded-md overflow-hidden bg-black">
                        {item.thumbnailUrl ? (
                          <Image
                            src={item.thumbnailUrl}
                            alt={item.title}
                            fill
                            className="object-cover"
                            unoptimized
                          />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                            <Music2 className="h-3 w-3" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0">
                        <h5 className="text-xs font-medium text-gray-200 line-clamp-1 group-hover:text-party-neonCyan transition-colors">
                          {item.title}
                        </h5>
                        <div className="flex items-center gap-1.5 text-[10px] text-gray-400">
                          <span className="truncate max-w-[120px]">{item.channelTitle}</span>
                          <span>•</span>
                          <span className="text-party-neonAmber">{formatDuration(item.durationSeconds)}</span>
                          <span>•</span>
                          {isItemFromHost ? (
                            <span className="flex items-center gap-0.5 text-amber-400 font-semibold px-1 rounded bg-amber-400/10">
                              <Crown className="h-2.5 w-2.5" /> Host
                            </span>
                          ) : (
                            <span className="text-purple-300 truncate max-w-[80px]">{item.addedBy}</span>
                          )}
                        </div>
                      </div>

                      {/* Host Reorder Controls */}
                      {isHost && onReorder && (
                        <div className="flex flex-col gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                          {index > 0 && (
                            <button
                              onClick={() => onReorder(index, index - 1)}
                              className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700/50"
                              title={t('moveUp')}
                            >
                              <ArrowUp className="h-3 w-3" />
                            </button>
                          )}
                          {index < queue.length - 1 && (
                            <button
                              onClick={() => onReorder(index, index + 1)}
                              className="p-1 text-gray-400 hover:text-white rounded hover:bg-gray-700/50"
                              title={t('moveDown')}
                            >
                              <ArrowDown className="h-3 w-3" />
                            </button>
                          )}
                        </div>
                      )}

                      {/* Delete Button */}
                      {canDelete && onRemove && (
                        <button
                          onClick={() => onRemove(item.id)}
                          className="p-1.5 text-gray-400 hover:text-rose-400 rounded-md hover:bg-rose-500/10 transition-colors opacity-0 group-hover:opacity-100"
                          title={t('removeTooltip')}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </>
        ) : (
          /* Played Songs History Tab */
          <div className="space-y-1.5">
            {history.length === 0 ? (
              <div className="flex flex-col items-center justify-center text-center py-10 px-4 text-gray-400">
                <p className="text-xs font-medium text-gray-300">{t('historyEmpty')}</p>
                <p className="text-[11px] text-gray-500 mt-1">{t('historyEmptyDesc')}</p>
              </div>
            ) : (
              history.map((item, index) => {
                const isItemFromHost = item.addedBy?.toLowerCase().includes('host');

                return (
                  <div
                    key={item.id || index}
                    className="flex items-center gap-2.5 p-2 rounded-xl bg-party-cardHover/30 hover:bg-party-cardHover border border-party-glowBorder/40 transition-all group"
                  >
                    <div className="relative w-12 h-8 flex-shrink-0 rounded-md overflow-hidden bg-black">
                      {item.thumbnailUrl ? (
                        <Image
                          src={item.thumbnailUrl}
                          alt={item.title}
                          fill
                          className="object-cover opacity-80 group-hover:opacity-100 transition-opacity"
                          unoptimized
                        />
                      ) : (
                        <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                          <Music2 className="h-3 w-3" />
                        </div>
                      )}
                    </div>

                    <div className="flex-1 min-w-0">
                      <h5 className="text-xs font-medium text-gray-300 line-clamp-1 group-hover:text-white transition-colors">
                        {item.title}
                      </h5>
                      <div className="flex items-center gap-1.5 text-[10px] text-gray-500">
                        <span className="truncate max-w-[120px]">{item.channelTitle}</span>
                        <span>•</span>
                        <span>{formatDuration(item.durationSeconds)}</span>
                        <span>•</span>
                        {isItemFromHost ? (
                          <span className="text-amber-400 font-medium">Host</span>
                        ) : (
                          <span className="text-gray-400 truncate max-w-[70px]">{item.addedBy}</span>
                        )}
                      </div>
                    </div>

                    {/* 1-Click Re-queue Button */}
                    {onRequeue && (
                      <button
                        onClick={() => onRequeue(item)}
                        className="flex items-center gap-1 px-2.5 py-1 rounded-lg bg-party-card border border-party-glowBorder hover:border-party-neonPurple text-[11px] font-semibold text-gray-300 hover:text-white transition-all active:scale-95 flex-shrink-0 shadow-sm"
                        title={t('requeueBtn')}
                      >
                        <RotateCcw className="h-3 w-3 text-party-neonCyan" />
                        <span>{t('requeueBtn')}</span>
                      </button>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}
      </div>
    </div>
  );
};
