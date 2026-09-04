'use client';

import React, { createContext, useContext, useState, useEffect, ReactNode } from 'react';

export type Language = 'th' | 'en';

export const translations = {
  th: {
    // Header
    appName: 'PartyTube',
    subtitle: 'ระบบคิวเพลง YouTube',
    hostTv: 'โฮสต์ TV',
    room: 'ห้อง',
    scanQR: 'สแกน QR',
    langTh: 'ไทย',
    langEn: 'EN',
    membersTitle: 'ผู้ร่วมปาร์ตี้',
    membersOnline: 'กำลังออนไลน์',
    hostBadge: 'โฮสต์',
    guestBadge: 'ผู้ร่วมงาน',

    // Landing Page
    landingBadge: 'ระบบคิวเพลง YouTube แบบ Real-time',
    landingTitle1: 'เปลี่ยนทีวีของคุณให้เป็น',
    landingTitle2: 'ตู้เพลงสำหรับปาร์ตี้',
    landingDesc: 'โฮสต์เปิดจอทีวี ส่วนผู้ร่วมงานสแกน QR Code เพื่อค้นหาเพลงและจัดคิวเพลงพร้อมกันแบบเรียลไทม์',
    hostCardTitle: 'สร้างห้องปาร์ตี้ (Host)',
    hostCardDesc: 'เปิดบนทีวีหรือคอมพิวเตอร์ แสดง QR Code, เครื่องเล่น YouTube และคิวเพลง',
    partyNamePlaceholder: 'ชื่อปาร์ตี้ (ระบุหรือไม่ก็ได้)',
    launchHostBtn: 'เปิดหน้าจอโฮสต์',
    guestCardTitle: 'เข้าร่วมปาร์ตี้ (Guest)',
    guestCardDesc: 'กรอกรหัสห้อง 6 ตัวอักษรจากหน้าจอโฮสต์เพื่อเริ่มเลือกเพลง',
    roomCodePlaceholder: 'กรอกรหัสห้อง (เช่น PT-9X2K)',
    joinPartyBtn: 'เข้าสู่คิวปาร์ตี้',
    feature1Title: 'ค้นหาเพลงฟรีไม่จำกัด',
    feature1Desc: 'ค้นหาเพลงหรือวางลิงก์ YouTube ได้โดยตรง ไม่ติดโควต้าการค้นหา',
    feature2Title: 'ซิงก์เรียลไทม์',
    feature2Desc: 'อัปเดตสถานะคิวและเพลงที่กำลังเล่นพร้อมกันทุกคนทันที',
    feature3Title: 'เล่นเพลงต่อเนื่องอัตโนมัติ',
    feature3Desc: 'เมื่อเพลงจบระบบจะเล่นเพลงถัดไปอัตโนมัติ พร้อมระบบข้ามและจัดลำดับ',

    // Host View
    waitingTitle: 'กำลังรอเพลงในคิว...',
    waitingDesc: 'สแกน QR Code เพื่อค้นหาและเพิ่มเพลงเข้าคิวปาร์ตี้',
    nowPlaying: 'กำลังเล่น',
    addedBy: 'เพิ่มโดย',
    addSongBtn: 'เพิ่มเพลงเข้าคิว',
    showQRBtn: 'แสดง QR Code เต็มจอ',
    continuousBadge: 'ระบบเล่นเพลงต่อเนื่องอัตโนมัติ',
    addSongHostModal: 'เพิ่มเพลงจากหน้าจอโฮสต์',
    close: 'ปิด',

    // Live Queue & History
    queueTitle: 'คิวเพลงในปาร์ตี้',
    upNext: 'รอเล่น',
    songsUnit: 'เพลง',
    queueEmpty: 'คิวเพลงว่างเปล่า',
    queueEmptyDesc: 'ค้นหาเพลงด้านบนเพื่อเริ่มเปิดเพลง',
    historyTab: 'ประวัติเพลง',
    queueTab: 'คิวเพลง',
    requeueBtn: 'เปิดอีกครั้ง',
    historyEmpty: 'ยังไม่มีเพลงที่เล่นจบ',
    historyEmptyDesc: 'เพลงที่เล่นจบแล้วจะมาแสดงที่นี่ เพื่อให้คุณกดเปิดซ้ำได้ทันที',
    removeTooltip: 'ลบออกจากคิว',
    moveUp: 'เลื่อนขึ้น',
    moveDown: 'เลื่อนลง',

    // Search Bar & Guest View
    searchPlaceholder: 'ค้นหาชื่อเพลง, ศิลปิน หรือวางลิงก์ YouTube...',
    clear: 'ล้าง',
    linkResolved: 'ตรวจพบลำดับลิงก์ YouTube',
    add: 'เพิ่ม',
    queueSongTitle: 'ค้นหาและเพิ่มเพลง YouTube',
    queueSongDesc: 'ค้นหาด้วยชื่อเพลง หรือวางลิงก์ YouTube / Shorts ได้โดยตรง',
    nowPlayingOnTV: 'กำลังเล่นบนจอทีวี',
    viewQueue: 'ดูคิวเพลง',
    searchTab: 'ค้นหาเพลง',

    // QR Card
    scanTitle: 'สแกนเพื่อเข้าร่วม',
    roomCodeLabel: 'รหัสห้อง',
    copied: 'คัดลอกลิงก์แล้ว',
    copyBtn: 'คัดลอกลิงก์สำหรับเพื่อน',

    // Nickname Modal
    modalTitle: 'เข้าร่วมปาร์ตี้',
    modalDesc: 'กรอกชื่อเล่นของคุณ เพื่อแสดงชื่อผู้เลือกเพลงในคิว',
    namePlaceholder: 'ชื่อเล่นของคุณ',
    enterPartyBtn: 'เข้าสู่ห้องปาร์ตี้',
    queuingAs: 'เลือกเพลงในชื่อ',
    changeName: 'เปลี่ยนชื่อ',

    // Toasts
    songAddedToast: 'เพิ่มเพลง "{title}" เข้าคิวแล้ว',
    hostAddedToast: '👑 Host ได้เพิ่มเพลง "{title}" เข้าคิวแล้ว',
    itemRemovedToast: 'ลบเพลงออกจากคิวแล้ว',
    skippingToast: 'กำลังข้ามเพลง...',
    joinedPartyToast: '{nickname} เข้าร่วมปาร์ตี้แล้ว',
    unembeddableToast: 'วิดีโอนี้ไม่สามารถเล่นผ่าน Embed ได้ ระบบกำลังข้ามไปเพลงถัดไป...',
  },
  en: {
    // Header
    appName: 'PartyTube',
    subtitle: 'Live YouTube Queue',
    hostTv: 'Host TV',
    room: 'Room',
    scanQR: 'Scan QR',
    langTh: 'ไทย',
    langEn: 'EN',
    membersTitle: 'Party Members',
    membersOnline: 'online',
    hostBadge: 'Host',
    guestBadge: 'Guest',

    // Landing Page
    landingBadge: 'Real-time YouTube Music Queue',
    landingTitle1: 'Turn Any TV into a',
    landingTitle2: 'Collaborative Jukebox',
    landingDesc: 'The host opens the player on a big screen. Guests scan a QR code on their phones to search and queue songs in real time.',
    hostCardTitle: 'Host a Party',
    hostCardDesc: 'Open on TV or laptop. Displays QR Code, YouTube player and live queue.',
    partyNamePlaceholder: 'Party Name (optional)',
    launchHostBtn: 'Launch Host Screen',
    guestCardTitle: 'Join as Guest',
    guestCardDesc: 'Enter the 6-character room code from the host screen.',
    roomCodePlaceholder: 'Enter Room Code (e.g. PT-9X2K)',
    joinPartyBtn: 'Join Party Queue',
    feature1Title: 'Unlimited Search',
    feature1Desc: 'Search songs or paste YouTube URLs directly with no quota limits.',
    feature2Title: 'Real-time Sync',
    feature2Desc: 'Instant synchronization across all devices when songs are added or played.',
    feature3Title: 'Continuous Playback',
    feature3Desc: 'Automatically advances to the next track when a video ends.',

    // Host View
    waitingTitle: 'Waiting for songs in queue...',
    waitingDesc: 'Scan the QR code to search and add YouTube songs.',
    nowPlaying: 'Now Playing',
    addedBy: 'Added by',
    addSongBtn: 'Add Song',
    showQRBtn: 'Fullscreen QR',
    continuousBadge: 'Continuous playback active',
    addSongHostModal: 'Add Song from Host Screen',
    close: 'Close',

    // Live Queue & History
    queueTitle: 'Party Queue',
    upNext: 'Up Next',
    songsUnit: 'songs',
    queueEmpty: 'Queue is empty',
    queueEmptyDesc: 'Search songs above to add to queue',
    historyTab: 'History',
    queueTab: 'Queue',
    requeueBtn: 'Re-queue',
    historyEmpty: 'No played songs yet',
    historyEmptyDesc: 'Finished songs will show here so you can replay them anytime',
    removeTooltip: 'Remove',
    moveUp: 'Move up',
    moveDown: 'Move down',

    // Search Bar & Guest View
    searchPlaceholder: 'Search song, artist, or paste YouTube link...',
    clear: 'Clear',
    linkResolved: 'YouTube link detected',
    add: 'Add',
    queueSongTitle: 'Search and Add Songs',
    queueSongDesc: 'Search by keyword or paste a YouTube / Shorts link.',
    nowPlayingOnTV: 'Now Playing on TV',
    viewQueue: 'View Queue',
    searchTab: 'Search',

    // QR Card
    scanTitle: 'Scan to Join',
    roomCodeLabel: 'Room Code',
    copied: 'Link copied',
    copyBtn: 'Copy Guest Link',

    // Nickname Modal
    modalTitle: 'Join the Party',
    modalDesc: 'Enter your nickname to show who queued each song.',
    namePlaceholder: 'Your nickname',
    enterPartyBtn: 'Enter Party',
    queuingAs: 'Queuing as',
    changeName: 'Change',

    // Toasts
    songAddedToast: 'Added "{title}" to queue',
    hostAddedToast: '👑 Host added "{title}" to the queue',
    itemRemovedToast: 'Item removed from queue',
    skippingToast: 'Skipping track...',
    joinedPartyToast: '{nickname} joined the party',
    unembeddableToast: 'Video is restricted from embed playback. Skipping...',
  },
};

type TranslationKey = keyof typeof translations.th;

interface LanguageContextType {
  language: Language;
  setLanguage: (lang: Language) => void;
  t: (key: TranslationKey, params?: Record<string, string | number>) => string;
}

const LanguageContext = createContext<LanguageContextType>({
  language: 'th',
  setLanguage: () => {},
  t: (key) => key,
});

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
  const [language, setLanguageState] = useState<Language>('th');

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const stored = localStorage.getItem('partytube_lang') as Language;
      if (stored === 'th' || stored === 'en') {
        setLanguageState(stored);
      } else {
        localStorage.setItem('partytube_lang', 'th');
      }
    }
  }, []);

  const setLanguage = React.useCallback((lang: Language) => {
    setLanguageState(lang);
    if (typeof window !== 'undefined') {
      localStorage.setItem('partytube_lang', lang);
    }
  }, []);

  const t = React.useCallback((key: TranslationKey, params?: Record<string, string | number>): string => {
    const dict = translations[language] || translations.th;
    let text = dict[key] || translations.th[key] || key;
    if (params) {
      Object.entries(params).forEach(([paramKey, val]) => {
        text = text.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(val));
      });
    }
    return text;
  }, [language]);

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export function useTranslation() {
  return useContext(LanguageContext);
}
