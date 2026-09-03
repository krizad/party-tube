'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Tv, Smartphone, ArrowRight, Loader2, Search, Radio, Music2 } from 'lucide-react';
import { createRoom } from '@/lib/api';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';
import { Header } from '@/components/Header';

export default function LandingPage() {
  const router = useRouter();
  const { t } = useTranslation();
  const [joinCode, setJoinCode] = useState('');
  const [partyTitle, setPartyTitle] = useState('');
  const [isCreating, setIsCreating] = useState(false);

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsCreating(true);
    try {
      const room = await createRoom(partyTitle || undefined);
      if (typeof window !== 'undefined') {
        localStorage.setItem(`partytube_host_token_${room.code}`, room.hostToken);
      }
      toast.success(`Party room ${room.code} created`);
      router.push(`/host/${room.code}?token=${room.hostToken}`);
    } catch (err: any) {
      toast.error(err.message || 'Could not create room');
      setIsCreating(false);
    }
  };

  const handleJoinRoom = (e: React.FormEvent) => {
    e.preventDefault();
    const code = joinCode.trim().toUpperCase();
    if (code.length < 4) {
      toast.error('Please enter a valid room code');
      return;
    }
    router.push(`/room/${code}`);
  };

  return (
    <div className="relative min-h-screen bg-party-dark flex flex-col overflow-hidden">
      {/* Top Header */}
      <Header />

      {/* Ambient Neon Glows */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-party-neonPurple/15 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute bottom-1/4 right-1/4 w-80 h-80 bg-party-neonPink/10 rounded-full blur-3xl pointer-events-none" />

      {/* Main Hero Container */}
      <main className="flex-1 flex flex-col items-center justify-center px-4 py-12">
        <div className="relative z-10 w-full max-w-4xl mx-auto text-center space-y-8">
          {/* Brand Hero Badge */}
          <div className="inline-flex items-center px-3.5 py-1.5 rounded-full bg-party-card border border-party-glowBorder/80 shadow-sm mb-1">
            <span className="text-xs font-medium text-gray-300">
              {t('landingBadge')}
            </span>
          </div>

          <h1 className="text-4xl sm:text-6xl font-extrabold tracking-tight text-white leading-tight">
            {t('landingTitle1')} <br />
            <span className="text-transparent bg-clip-text bg-gradient-to-r from-party-neonPink via-party-neonPurple to-party-neonCyan">
              {t('landingTitle2')}
            </span>
          </h1>

          <p className="text-sm sm:text-base text-gray-400 max-w-xl mx-auto leading-relaxed">
            {t('landingDesc')}
          </p>

          {/* Action Cards Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-5 max-w-2xl mx-auto pt-4 text-left">
            {/* Create Party Card (Host) */}
            <div className="p-6 rounded-2xl bg-party-card border border-party-glowBorder/80 hover:border-party-neonPurple/50 transition-all shadow-lg flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-purple-500/20 text-party-neonPurple flex items-center justify-center mb-3">
                  <Tv className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{t('hostCardTitle')}</h3>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  {t('hostCardDesc')}
                </p>
              </div>

              <form onSubmit={handleCreateRoom} className="space-y-3">
                <input
                  type="text"
                  placeholder={t('partyNamePlaceholder')}
                  value={partyTitle}
                  onChange={(e) => setPartyTitle(e.target.value)}
                  maxLength={30}
                  className="w-full px-3.5 py-2.5 bg-party-cardHover text-white placeholder-gray-500 rounded-xl border border-party-glowBorder text-xs focus:outline-none focus:border-party-neonPurple"
                />
                <button
                  type="submit"
                  disabled={isCreating}
                  className="w-full py-2.5 rounded-xl bg-party-neonPurple hover:bg-purple-600 text-white font-semibold text-xs shadow-md shadow-party-neonPurple/25 flex items-center justify-center gap-2 active:scale-98 transition-all"
                >
                  {isCreating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      {t('launchHostBtn')} <ArrowRight className="h-3.5 w-3.5" />
                    </>
                  )}
                </button>
              </form>
            </div>

            {/* Join Party Card (Guest) */}
            <div className="p-6 rounded-2xl bg-party-card border border-party-glowBorder/80 hover:border-party-neonCyan/50 transition-all shadow-lg flex flex-col justify-between group">
              <div>
                <div className="w-10 h-10 rounded-xl bg-cyan-500/20 text-party-neonCyan flex items-center justify-center mb-3">
                  <Smartphone className="h-5 w-5" />
                </div>
                <h3 className="text-lg font-bold text-white mb-1">{t('guestCardTitle')}</h3>
                <p className="text-xs text-gray-400 mb-4 leading-relaxed">
                  {t('guestCardDesc')}
                </p>
              </div>

              <form onSubmit={handleJoinRoom} className="space-y-3">
                <input
                  type="text"
                  placeholder={t('roomCodePlaceholder')}
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  maxLength={8}
                  className="w-full px-3.5 py-2.5 bg-party-cardHover text-white placeholder-gray-500 rounded-xl border border-party-glowBorder text-xs uppercase font-mono tracking-wider focus:outline-none focus:border-party-neonCyan"
                />
                <button
                  type="submit"
                  disabled={!joinCode.trim()}
                  className="w-full py-2.5 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white font-semibold text-xs shadow-md shadow-party-neonCyan/25 flex items-center justify-center gap-2 active:scale-98 disabled:opacity-50 transition-all"
                >
                  {t('joinPartyBtn')} <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </form>
            </div>
          </div>

          {/* Feature Highlights Row */}
          <div className="pt-8 grid grid-cols-1 sm:grid-cols-3 gap-3.5 max-w-3xl mx-auto text-left">
            <div className="p-4 rounded-xl bg-party-card/50 border border-party-glowBorder/50">
              <Search className="h-4 w-4 text-party-neonPurple mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">{t('feature1Title')}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{t('feature1Desc')}</p>
            </div>
            <div className="p-4 rounded-xl bg-party-card/50 border border-party-glowBorder/50">
              <Radio className="h-4 w-4 text-party-neonPink mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">{t('feature2Title')}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{t('feature2Desc')}</p>
            </div>
            <div className="p-4 rounded-xl bg-party-card/50 border border-party-glowBorder/50">
              <Music2 className="h-4 w-4 text-party-neonCyan mb-2" />
              <h4 className="text-xs font-bold text-white mb-1">{t('feature3Title')}</h4>
              <p className="text-xs text-gray-400 leading-relaxed">{t('feature3Desc')}</p>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
