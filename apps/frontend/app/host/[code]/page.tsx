'use client';

import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams } from 'next/navigation';
import { usePartySocket } from '@/hooks/usePartySocket';
import { Header } from '@/components/Header';
import { HostPlayer } from '@/components/HostPlayer';
import { LiveQueue } from '@/components/LiveQueue';
import { QRCodeCard } from '@/components/QRCodeCard';
import { SearchBar } from '@/components/SearchBar';
import { MembersModal } from '@/components/MembersModal';
import { QrCode, Plus } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

export default function HostPage() {
  const { t } = useTranslation();
  const params = useParams();
  const searchParams = useSearchParams();
  const roomCode = ((params.code as string) || '').toUpperCase();
  const tokenFromUrl = searchParams.get('token') || '';

  const [hostToken, setHostToken] = useState<string>('');
  const [showQRModal, setShowQRModal] = useState(false);
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showMembersModal, setShowMembersModal] = useState(false);
  const [remoteSeekTime, setRemoteSeekTime] = useState<number | null>(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem(`partytube_host_token_${roomCode}`);
      const token = tokenFromUrl || stored || '';
      setHostToken(token);
      if (tokenFromUrl) {
        localStorage.setItem(`partytube_host_token_${roomCode}`, tokenFromUrl);
      }
    }
  }, [roomCode, tokenFromUrl]);

  const {
    isConnected,
    queue,
    history,
    members,
    currentTrack,
    guestCount,
    addToQueue,
    removeFromQueue,
    reorderQueue,
    sendTimeUpdate,
    notifyPlayerEnded,
    notifyPlaybackError,
    skipTrack,
  } = usePartySocket({
    roomCode,
    nickname: 'Host (TV)',
    role: 'host',
    hostToken,
    onSeekCommand: (time) => {
      setRemoteSeekTime(time);
    },
  });

  return (
    <div className="min-h-screen bg-party-dark flex flex-col">
      <Header
        roomCode={roomCode}
        guestCount={guestCount}
        isConnected={isConnected}
        isHost={true}
        onOpenQR={() => setShowQRModal(true)}
        onOpenMembers={() => setShowMembersModal(true)}
      />

      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 grid grid-cols-1 lg:grid-cols-12 gap-5 items-start">
        <div className="lg:col-span-8 flex flex-col space-y-3.5">
          <HostPlayer
            currentTrack={currentTrack}
            onEnded={notifyPlayerEnded}
            onSkip={skipTrack}
            onError={notifyPlaybackError}
            onTimeUpdate={sendTimeUpdate}
            seekTime={remoteSeekTime}
            roomCode={roomCode}
          />

          <div className="flex items-center justify-between p-3.5 rounded-2xl bg-party-card border border-party-glowBorder">
            <div className="flex items-center gap-2.5">
              <button
                onClick={() => setShowSearchModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-party-cardHover hover:bg-party-neonPurple/20 text-xs font-semibold text-white border border-party-glowBorder hover:border-party-neonPurple transition-all"
              >
                <Plus className="h-3.5 w-3.5 text-party-neonCyan" /> {t('addSongBtn')}
              </button>

              <button
                onClick={() => setShowQRModal(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-party-cardHover hover:bg-party-neonPink/20 text-xs font-semibold text-white border border-party-glowBorder hover:border-party-neonPink transition-all"
              >
                <QrCode className="h-3.5 w-3.5 text-party-neonPink" /> {t('showQRBtn')}
              </button>
            </div>

            <div className="hidden sm:flex items-center text-xs text-gray-400">
              <span>{t('continuousBadge')}</span>
            </div>
          </div>
        </div>

        <div className="lg:col-span-4 flex flex-col space-y-5">
          <LiveQueue
            queue={queue}
            history={history}
            currentTrack={currentTrack}
            isHost={true}
            onRemove={removeFromQueue}
            onReorder={reorderQueue}
            onRequeue={(item) => {
              addToQueue({
                videoId: item.videoId,
                title: item.title,
                thumbnailUrl: item.thumbnailUrl,
                channelTitle: item.channelTitle,
                durationSeconds: item.durationSeconds,
                addedBy: 'Host (TV)',
              });
            }}
          />

          <div className="hidden lg:block">
            <QRCodeCard roomCode={roomCode} />
          </div>
        </div>
      </main>

      {showQRModal && (
        <QRCodeCard
          roomCode={roomCode}
          isModal={true}
          onClose={() => setShowQRModal(false)}
        />
      )}

      {showMembersModal && (
        <MembersModal
          isOpen={showMembersModal}
          onClose={() => setShowMembersModal(false)}
          members={members}
          roomCode={roomCode}
        />
      )}

      {showSearchModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
          <div className="w-full max-w-xl p-5 rounded-2xl bg-party-card border border-party-glowBorder shadow-2xl space-y-3.5">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold text-white">
                {t('addSongHostModal')}
              </h3>
              <button
                onClick={() => setShowSearchModal(false)}
                className="text-gray-400 hover:text-white text-xs px-2 py-1 rounded-md bg-party-cardHover"
              >
                {t('close')}
              </button>
            </div>

            <SearchBar
              onAddSong={(song) => {
                addToQueue({
                  ...song,
                  addedBy: 'Host (TV)',
                });
                setShowSearchModal(false);
              }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
