'use client';

import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import { Copy, Check, X } from 'lucide-react';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface QRCodeCardProps {
  roomCode: string;
  isModal?: boolean;
  onClose?: () => void;
}

export const QRCodeCard: React.FC<QRCodeCardProps> = ({
  roomCode,
  isModal = false,
  onClose,
}) => {
  const { t } = useTranslation();
  const [copied, setCopied] = useState(false);
  const joinUrl = typeof window !== 'undefined'
    ? `${window.location.origin}/room/${roomCode}`
    : `https://partytube.app/room/${roomCode}`;

  const handleCopy = () => {
    if (typeof navigator !== 'undefined') {
      navigator.clipboard.writeText(joinUrl);
      setCopied(true);
      toast.success(t('copied'));
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const cardContent = (
    <div className="flex flex-col items-center text-center p-5 bg-party-card rounded-2xl border border-party-glowBorder shadow-xl relative">
      {isModal && onClose && (
        <button
          onClick={onClose}
          className="absolute top-3.5 right-3.5 p-1 text-gray-400 hover:text-white rounded-lg bg-party-cardHover hover:bg-gray-700 transition"
        >
          <X className="h-4 w-4" />
        </button>
      )}

      <div className="text-xs font-semibold text-gray-300 uppercase tracking-wider mb-3">
        {t('scanTitle')}
      </div>

      {/* QR Code Container */}
      <div className="p-3 bg-white rounded-xl shadow-md mb-3">
        <QRCodeSVG
          value={joinUrl}
          size={160}
          level="H"
          includeMargin={false}
        />
      </div>

      {/* Room Code */}
      <div className="text-[11px] text-gray-400 mb-0.5">{t('roomCodeLabel')}</div>
      <div className="text-2xl font-bold font-mono tracking-wider text-party-neonCyan mb-3">
        {roomCode}
      </div>

      {/* Copy Link Button */}
      <button
        onClick={handleCopy}
        className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg bg-party-cardHover hover:bg-party-card text-xs font-medium text-gray-300 hover:text-white border border-party-glowBorder transition-all active:scale-95"
      >
        {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5 text-gray-400" />}
        {copied ? t('copied') : t('copyBtn')}
      </button>
    </div>
  );

  if (isModal) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4">
        <div className="w-full max-w-sm animate-in fade-in zoom-in duration-150">
          {cardContent}
        </div>
      </div>
    );
  }

  return cardContent;
};
