'use client';

import React, { useState } from 'react';
import { User, Music2 } from 'lucide-react';
import { useTranslation } from '@/lib/i18n';

interface NicknameModalProps {
  isOpen: boolean;
  onConfirm: (nickname: string) => void;
}

export const NicknameModal: React.FC<NicknameModalProps> = ({
  isOpen,
  onConfirm,
}) => {
  const { t } = useTranslation();
  const [name, setName] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = name.trim();
    if (trimmed) {
      onConfirm(trimmed);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-sm p-6 rounded-2xl bg-party-card border border-party-glowBorder shadow-2xl text-center">
        <div className="mx-auto w-12 h-12 rounded-xl bg-purple-500/20 text-party-neonPurple flex items-center justify-center mb-4">
          <Music2 className="h-6 w-6" />
        </div>

        <h3 className="text-lg font-bold text-white mb-1">
          {t('modalTitle')}
        </h3>
        <p className="text-xs text-gray-400 mb-5 leading-relaxed">
          {t('modalDesc')}
        </p>

        <form onSubmit={handleSubmit} className="space-y-3.5">
          <div className="relative">
            <User className="absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              required
              maxLength={20}
              autoFocus
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder={t('namePlaceholder')}
              className="w-full pl-10 pr-4 py-2.5 bg-party-cardHover text-white placeholder-gray-500 rounded-xl border border-party-glowBorder focus:outline-none focus:border-party-neonPurple text-xs font-medium"
            />
          </div>

          <button
            type="submit"
            disabled={!name.trim()}
            className="w-full py-2.5 rounded-xl bg-party-neonPurple hover:bg-purple-600 text-white font-semibold text-xs shadow-md shadow-party-neonPurple/25 active:scale-98 disabled:opacity-50 transition-all"
          >
            {t('enterPartyBtn')}
          </button>
        </form>
      </div>
    </div>
  );
};
