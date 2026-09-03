'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Search, Loader2, Plus, Music2, Check } from 'lucide-react';
import { searchYouTube, getSearchSuggestions } from '@/lib/api';
import { SearchResultItem } from '@partytube/shared-types';
import Image from 'next/image';
import { toast } from 'sonner';
import { useTranslation } from '@/lib/i18n';

interface SearchBarProps {
  onAddSong: (item: {
    videoId: string;
    title: string;
    thumbnailUrl: string;
    channelTitle: string;
    durationSeconds: number;
  }) => void;
}

export const SearchBar: React.FC<SearchBarProps> = ({ onAddSong }) => {
  const { t } = useTranslation();
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<SearchResultItem[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [loading, setLoading] = useState(false);
  const [isUrl, setIsUrl] = useState(false);
  const debounceRef = useRef<NodeJS.Timeout | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);

  const checkIsUrl = (text: string) => {
    return text.includes('youtube.com') || text.includes('youtu.be');
  };

  useEffect(() => {
    const trimmed = query.trim();

    // Abort previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }

    if (!trimmed) {
      setResults([]);
      setSuggestions([]);
      setLoading(false);
      setIsUrl(false);
      return;
    }

    const isDirectUrl = checkIsUrl(trimmed);
    setIsUrl(isDirectUrl);

    // Don't search for single characters to prevent accidental nursery rhyme / alphabet search
    if (!isDirectUrl && trimmed.length < 2) {
      setLoading(false);
      setSuggestions([]);
      return;
    }

    if (debounceRef.current) {
      clearTimeout(debounceRef.current);
    }

    const delay = isDirectUrl ? 150 : 350;

    debounceRef.current = setTimeout(async () => {
      const controller = new AbortController();
      abortControllerRef.current = controller;

      setLoading(true);
      try {
        if (!isDirectUrl) {
          getSearchSuggestions(trimmed, controller.signal)
            .then(setSuggestions)
            .catch(() => {});
        } else {
          setSuggestions([]);
        }

        const res = await searchYouTube(trimmed, controller.signal);
        setResults(res.results || []);

        if (isDirectUrl && res.results.length === 1) {
          toast.info(t('linkResolved'));
        }
      } catch (err: any) {
        if (err.name !== 'AbortError') {
          toast.error('Could not fetch YouTube results');
        }
      } finally {
        if (!controller.signal.aborted) {
          setLoading(false);
        }
      }
    }, delay);

    return () => {
      if (debounceRef.current) {
        clearTimeout(debounceRef.current);
      }
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [query, t]);

  const handleAdd = (video: SearchResultItem) => {
    onAddSong({
      videoId: video.videoId,
      title: video.title,
      thumbnailUrl: video.thumbnailUrl,
      channelTitle: video.channelTitle,
      durationSeconds: video.durationSeconds,
    });
  };

  return (
    <div className="flex flex-col w-full">
      {/* Search Input Box */}
      <div className="relative w-full">
        <div className="absolute inset-y-0 left-0 pl-3.5 flex items-center pointer-events-none text-gray-400">
          {loading ? (
            <Loader2 className="h-4 w-4 animate-spin text-party-neonCyan" />
          ) : (
            <Search className="h-4 w-4" />
          )}
        </div>

        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder={t('searchPlaceholder')}
          className="w-full pl-9 pr-14 py-2.5 bg-party-card text-white placeholder-gray-400 rounded-xl border border-party-glowBorder focus:outline-none focus:border-party-neonPurple text-xs font-medium transition-all"
        />

        {query && (
          <button
            onClick={() => {
              setQuery('');
              setSuggestions([]);
              setResults([]);
            }}
            className="absolute inset-y-0 right-0 pr-3.5 flex items-center text-xs text-gray-400 hover:text-white"
          >
            {t('clear')}
          </button>
        )}
      </div>

      {/* Instant Suggestions Pills */}
      {suggestions.length > 0 && !isUrl && (
        <div className="flex gap-1.5 overflow-x-auto py-2 px-0.5 scrollbar-none">
          {suggestions.slice(0, 5).map((sugg, i) => (
            <button
              key={i}
              onClick={() => setQuery(sugg)}
              className="flex-shrink-0 px-2.5 py-1 rounded-md bg-party-cardHover hover:bg-party-card text-xs text-gray-300 hover:text-white border border-party-glowBorder/60 transition-colors"
            >
              {sugg}
            </button>
          ))}
        </div>
      )}

      {/* Direct link notice */}
      {isUrl && results.length > 0 && (
        <div className="mt-1.5 flex items-center gap-1.5 text-xs text-party-neonPink px-1">
          <Check className="h-3 w-3" /> {t('linkResolved')}
        </div>
      )}

      {/* Search Results List */}
      {results.length > 0 && (
        <div className="mt-2.5 space-y-1.5 max-h-96 overflow-y-auto p-0.5 scrollbar-thin">
          {results.map((video) => (
            <div
              key={video.videoId}
              className="flex items-center gap-2.5 p-2 rounded-xl bg-party-card hover:bg-party-cardHover border border-party-glowBorder hover:border-party-neonPurple/40 transition-all group"
            >
              <div className="relative w-14 h-9 flex-shrink-0 rounded-md overflow-hidden bg-black">
                {video.thumbnailUrl ? (
                  <Image
                    src={video.thumbnailUrl}
                    alt={video.title}
                    fill
                    className="object-cover"
                    unoptimized
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-gray-800 text-gray-400">
                    <Music2 className="h-3.5 w-3.5" />
                  </div>
                )}
                <span className="absolute bottom-0.5 right-0.5 px-1 rounded bg-black/80 text-[9px] font-medium text-white">
                  {video.duration}
                </span>
              </div>

              <div className="flex-1 min-w-0">
                <h4 className="text-xs font-medium text-white line-clamp-1 group-hover:text-party-neonCyan transition-colors">
                  {video.title}
                </h4>
                <p className="text-[11px] text-gray-400 truncate">{video.channelTitle}</p>
              </div>

              <button
                onClick={() => handleAdd(video)}
                className="flex items-center gap-1 px-2.5 py-1.5 rounded-lg bg-party-neonPurple hover:bg-purple-600 active:scale-95 text-xs font-semibold text-white transition-all shadow-sm"
              >
                <Plus className="h-3.5 w-3.5" /> {t('add')}
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
