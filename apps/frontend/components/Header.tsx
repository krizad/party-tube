'use client';

import React from 'react';
import { Music2, Users } from 'lucide-react';
import Link from 'next/link';
import { useTranslation } from '@/lib/i18n';

interface HeaderProps {
  roomCode?: string;
  guestCount?: number;
  isConnected?: boolean;
  isHost?: boolean;
  onOpenQR?: () => void;
  onOpenMembers?: () => void;
}

export const Header: React.FC<HeaderProps> = ({
  roomCode,
  guestCount = 1,
  isConnected = false,
  isHost = false,
  onOpenQR,
  onOpenMembers,
}) => {
  const { language, setLanguage, t } = useTranslation();

  return (
    <header className="sticky top-0 z-40 w-full border-b border-party-glowBorder/60 bg-party-dark/90 backdrop-blur-md px-4 py-3 sm:px-6">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        {/* Brand */}
        <Link href="/" className="flex items-center gap-2.5 group">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-gradient-to-tr from-party-neonPurple to-party-neonPink text-white shadow-md shadow-party-neonPurple/20">
            <Music2 className="h-4.5 w-4.5" />
          </div>
          <div className="flex flex-col">
            <span className="text-lg font-bold tracking-tight text-white flex items-center">
              Party<span className="text-party-neonPink">Tube</span>
            </span>
            <span className="hidden sm:inline-block text-[10px] font-medium text-gray-400">
              {t('subtitle')}
            </span>
          </div>
        </Link>

        {/* Right Section: Language Toggle & Room Info */}
        <div className="flex items-center gap-2 sm:gap-3">
          {/* Language Switcher */}
          <div className="flex items-center rounded-lg bg-party-card border border-party-glowBorder/80 p-0.5 text-xs font-semibold">
            <button
              onClick={() => setLanguage('th')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'th'
                  ? 'bg-party-neonPurple/25 text-party-neonCyan font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              TH
            </button>
            <span className="text-gray-600 text-[10px]">|</span>
            <button
              onClick={() => setLanguage('en')}
              className={`px-2 py-1 rounded-md transition-colors ${
                language === 'en'
                  ? 'bg-party-neonPurple/25 text-party-neonCyan font-bold'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              EN
            </button>
          </div>

          {roomCode && (
            <>
              {/* Host Badge */}
              {isHost && (
                <span className="hidden sm:inline-flex items-center rounded-md bg-purple-500/15 px-2.5 py-1 text-xs font-medium text-party-neonPurple border border-purple-500/25">
                  {t('hostTv')}
                </span>
              )}

              {/* Room Code Badge */}
              <button
                onClick={onOpenQR}
                className="flex items-center gap-1.5 rounded-lg bg-party-card px-2.5 py-1 text-xs font-semibold text-white border border-party-glowBorder hover:border-party-neonPurple transition-colors"
                title={t('scanQR')}
              >
                <span className="text-gray-400">{t('room')}:</span>
                <span className="font-mono tracking-wider text-party-neonCyan">{roomCode}</span>
              </button>

              {/* Clickable Live Status & Guest Count Badge */}
              <button
                onClick={onOpenMembers}
                className="flex items-center gap-1.5 rounded-lg bg-party-card/80 hover:bg-party-cardHover px-2 py-1 border border-party-glowBorder hover:border-party-neonCyan text-xs text-gray-300 transition-all active:scale-95"
                title={t('membersTitle')}
              >
                <span className={`inline-block rounded-full h-2 w-2 ${isConnected ? 'bg-emerald-400' : 'bg-rose-400'}`} />
                <Users className="h-3.5 w-3.5 text-party-neonCyan" />
                <span className="font-medium">{guestCount}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
