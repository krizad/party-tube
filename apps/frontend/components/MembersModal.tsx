'use client';

import React from 'react';
import { RoomMember } from '@partytube/shared-types';
import { X, Users, Crown, Shield } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface MembersModalProps {
  isOpen: boolean;
  onClose: () => void;
  members: RoomMember[];
  roomCode: string;
}

export const MembersModal: React.FC<MembersModalProps> = ({
  isOpen,
  onClose,
  members,
  roomCode,
}) => {
  const { t } = useTranslation();

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-150">
      <div className="w-full max-w-sm rounded-2xl bg-party-card border border-party-glowBorder shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="p-4 border-b border-party-glowBorder flex items-center justify-between bg-party-card">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-party-neonCyan" />
            <h3 className="text-sm font-bold text-white tracking-wide">
              {t('membersTitle')}
            </h3>
            <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-party-neonPurple/20 text-party-neonCyan border border-party-neonPurple/30">
              {members.length} {t('membersOnline')}
            </span>
          </div>

          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-white hover:bg-party-cardHover transition"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        {/* Member List */}
        <div className="p-3 max-h-80 overflow-y-auto space-y-1.5 scrollbar-thin">
          {members.length === 0 ? (
            <div className="text-center py-6 text-xs text-gray-400">
              {t('membersOnline')} (0)
            </div>
          ) : (
            members.map((member) => (
              <div
                key={member.socketId}
                className="flex items-center justify-between p-2 rounded-xl bg-party-cardHover/50 hover:bg-party-cardHover border border-party-glowBorder/40 transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className={`w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold text-white flex-shrink-0 ${
                    member.isHost
                      ? 'bg-gradient-to-tr from-amber-500 to-party-neonPink shadow-sm shadow-amber-500/30'
                      : 'bg-party-card border border-party-glowBorder text-gray-300'
                  }`}>
                    {member.nickname.charAt(0).toUpperCase()}
                  </div>

                  <div className="min-w-0">
                    <span className="text-xs font-medium text-gray-100 truncate block">
                      {member.nickname}
                    </span>
                  </div>
                </div>

                {member.isHost ? (
                  <span className="flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-md bg-amber-500/15 text-amber-400 border border-amber-500/30">
                    <Crown className="h-3 w-3" /> {t('hostBadge')}
                  </span>
                ) : (
                  <span className="text-[10px] font-medium px-2 py-0.5 rounded-md bg-gray-800 text-gray-400">
                    {t('guestBadge')}
                  </span>
                )}
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
