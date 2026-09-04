'use client';

import React, { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import { usePartySocket } from '@/hooks/usePartySocket';
import { Header } from '@/components/Header';
import { LiveQueue } from '@/components/LiveQueue';
import { SearchBar } from '@/components/SearchBar';
import { NicknameModal } from '@/components/NicknameModal';
import { MembersModal } from '@/components/MembersModal';
import { Search, Music2 } from 'lucide-react';
import { formatDuration } from '@/lib/utils';
import { useTranslation } from '@/lib/i18n';

export default function GuestRoomPage() {
  const { t } = useTranslation();
  const params = useParams();
  const roomCode = ((params.code as string) || '').toUpperCase();

  const [nickname, setNickname] = useState<string>('');
  const [hasNickname, setHasNickname] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'search' | 'queue'>('search');
  const [showMembersModal, setShowMembersModal] = useState<boolean>(false);

  // Scrubber state on mobile
  const [isScrubbing, setIsScrubbing] = useState(false);
  const [scrubVal, setScrubVal] = useState<number>(0);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = sessionStorage.getItem('partytube_nickname');
      if (stored) {
        setNickname(stored);
        setHasNickname(true);
      }
    }
  }, []);

  const handleNicknameConfirm = (name: string) => {
    setNickname(name);
    setHasNickname(true);
    if (typeof window !== 'undefined') {
      sessionStorage.setItem('partytube_nickname', name);
    }
  };

  const {
    isConnected,
    queue,
    history,
    members,
    currentTrack,
    guestCount,
    currentTime,
    duration,
    seekTrack,
    addToQueue,
    removeFromQueue,
  } = usePartySocket({
    roomCode,
    nickname: hasNickname ? nickname : '',
    role: 'guest',
  });

  const displayTime = isScrubbing ? scrubVal : currentTime;
  const progressPercent = duration > 0 ? (displayTime / duration) * 100 : 0;

  const handleMobileScrubCommit = () => {
    seekTrack(scrubVal);
    setIsScrubbing(false);
  };

  return (
    <div className="min-h-screen bg-party-dark flex flex-col pb-20 sm:pb-8">
      {/* Nickname Prompt Modal */}
      <NicknameModal
        isOpen={!hasNickname}
        onConfirm={handleNicknameConfirm}
      />

      {/* Members Modal */}
      {showMembersModal && (
        <MembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          members={members}
          roomCode={roomCode}
        />
      )}

      {/* Top Header */}
      <Header
        roomCode={roomCode}
        guestCount={guestCount}
        isConnected={isConnected}
        isHost={false}
        onOpenMembers={() => setShowMembersModal(true)}
      />

      {/* Main Content Area */}
      <main className="flex-1 max-w-2xl w-full mx-auto p-4 sm:p-6 space-y-4">
        {/* Guest Profile Greeting */}
        {hasNickname && (
          <div className="flex items-center justify-between px-3.5 py-2 rounded-xl bg-party-card border border-party-glowBorder/80">
            <div className="flex items-center gap-2 text-xs text-gray-300">
              <span className="w-6 h-6 rounded-md bg-party-neonPurple/20 text-party-neonPurple flex items-center justify-center text-[10px] font-bold">
                {nickname.charAt(0).toUpperCase()}
              </span>
              <span>{t('queuingAs')} <strong className="text-party-neonCyan">{nickname}</strong></span>
            </div>
            <button
              onClick={() => setHasNickname(false)}
              className="text-[11px] font-medium text-gray-400 hover:text-white transition"
            >
              {t('changeName')}
            </button>
          </div>
        )}

        {/* Tab Switcher */}
        <div className="flex p-1 rounded-xl bg-party-card border border-party-glowBorder">
          <button
            onClick={() => setActiveTab('search')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'search'
                ? 'bg-party-neonPurple text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Search className="h-3.5 w-3.5" /> {t('searchTab')}
          </button>
          <button
            onClick={() => setActiveTab('queue')}
            className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'queue'
                ? 'bg-party-neonPurple text-white shadow-sm'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <Music2 className="h-3.5 w-3.5" /> {t('queueTab')} ({queue.length})
          </button>
        </div>

        {/* Tab Content */}
        {activeTab === 'search' ? (
          <div className="space-y-3.5">
            <div className="p-4 rounded-2xl bg-party-card border border-party-glowBorder">
              <h3 className="text-xs font-bold text-white mb-0.5">
                {t('queueSongTitle')}
              </h3>
              <p className="text-[11px] text-gray-400 mb-3.5">
                {t('queueSongDesc')}
              </p>
              <SearchBar
                onAddSong={(item) => {
                  addToQueue({
                    ...item,
                    addedBy: nickname || 'Party Guest',
                  });
                }}
              />
            </div>

            {/* Now Playing Teaser with Collaborative Seeker (Q1 Option B) */}
            {currentTrack && (
              <div className="p-3.5 rounded-xl bg-party-card border border-party-glowBorder space-y-2.5">
                <div
                  onClick={() => setActiveTab('queue')}
                  className="cursor-pointer flex items-center justify-between"
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <Music2 className="h-4 w-4 text-party-neonPink flex-shrink-0" />
                    <div className="min-w-0">
                      <p className="text-[9px] uppercase font-semibold text-party-neonPink">{t('nowPlayingOnTV')}</p>
                      <p className="text-xs font-medium text-white truncate">{currentTrack.title}</p>
                    </div>
                  </div>
                  <span className="text-[11px] font-medium text-party-neonCyan flex-shrink-0 ml-2">
                    {t('viewQueue')} →
                  </span>
                </div>

                {/* Collaborative Scrubber Bar on Mobile */}
                <div className="flex items-center gap-2.5 pt-1">
                  <span className="text-[10px] font-mono text-gray-400 min-w-[28px]">
                    {formatDuration(displayTime)}
                  </span>
                  <div className="relative flex-1 flex items-center cursor-pointer">
                    <div className="w-full h-1.5 bg-gray-700/70 rounded-full overflow-hidden">
                      <div
                        className="h-full bg-gradient-to-r from-party-neonPurple to-party-neonPink rounded-full transition-all"
                        style={{ width: `${Math.min(100, Math.max(0, progressPercent))}%` }}
                      />
                    </div>
                    <input
                      type="range"
                      min={0}
                      max={duration || 100}
                      value={displayTime}
                      onChange={(e) => {
                        setIsScrubbing(true);
                        setScrubVal(parseInt(e.target.value, 10));
                      }}
                      onMouseUp={handleMobileScrubCommit}
                      onTouchEnd={handleMobileScrubCommit}
                      className="absolute inset-0 w-full opacity-0 cursor-pointer"
                    />
                  </div>
                  <span className="text-[10px] font-mono text-gray-400 min-w-[28px]">
                    {formatDuration(duration)}
                  </span>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div className="space-y-4">
            <LiveQueue
              queue={queue}
              history={history}
              currentTrack={currentTrack}
              isHost={false}
              userNickname={nickname}
              onRemove={removeFromQueue}
              onRequeue={(item) => {
                addToQueue({
                  videoId: item.videoId,
                  title: item.title,
                  thumbnailUrl: item.thumbnailUrl,
                  channelTitle: item.channelTitle,
                  durationSeconds: item.durationSeconds,
                  addedBy: nickname || 'Party Guest',
                });
              }}
            />
          </div>
        )}
      </main>

      {/* Sticky Mobile Bottom Navigation */}
      <nav className="fixed bottom-0 inset-x-0 z-40 bg-party-card border-t border-party-glowBorder sm:hidden flex items-center justify-around py-2 px-4">
        <button
          onClick={() => setActiveTab('search')}
          className={`flex flex-col items-center gap-1 text-[10px] font-medium ${
            activeTab === 'search' ? 'text-party-neonCyan font-bold' : 'text-gray-400'
          }`}
        >
          <Search className="h-4 w-4" />
          <span>{t('searchTab')}</span>
        </button>

        <button
          onClick={() => setActiveTab('queue')}
          className={`relative flex flex-col items-center gap-1 text-[10px] font-medium ${
            activeTab === 'queue' ? 'text-party-neonPink font-bold' : 'text-gray-400'
          }`}
        >
          <Music2 className="h-4 w-4" />
          <span>{t('queueTab')}</span>
          {queue.length > 0 && (
            <span className="absolute -top-1 right-2 px-1 rounded-full bg-party-neonPink text-white text-[8px] font-bold">
              {queue.length}
            </span>
          )}
        </button>
      </nav>
    </div>
  );
}
