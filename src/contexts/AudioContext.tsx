import React, { createContext, useContext, useEffect, useRef, useState, useCallback, ReactNode } from 'react';
import { Surah, Reciter } from '../types';
import { famousReciters, getValidAudioUrl, getReciterById } from '../data/reciters';
import { fetchSurahs } from '../api/quranApi';
import toast from 'react-hot-toast';

interface AudioContextType {
  // Audio state
  isPlaying: boolean;
  isLoading: boolean;
  currentTime: number;
  duration: number;
  volume: number;
  playingSurah: number | null;
  selectedReciter: Reciter | null;
  surahs: Surah[];
  reciters: Reciter[];

  // Actions
  playAudio: (reciterId: string, surahNumber: number, surahName: string) => Promise<void>;
  togglePlayPause: () => void;
  playNext: () => void;
  playPrevious: () => void;
  setVolume: (volume: number) => void;
  seek: (time: number) => void;
  setReciter: (reciterId: string) => void;
  jumpToSurah: (surahNumber: number) => void;
}

const AudioContext = createContext<AudioContextType | undefined>(undefined);

export const useAudio = () => {
  const context = useContext(AudioContext);
  if (!context) {
    throw new Error('useAudio must be used within an AudioProvider');
  }
  return context;
};

interface AudioProviderProps {
  children: ReactNode;
}

export const AudioProvider: React.FC<AudioProviderProps> = ({ children }) => {
  // Audio state
  const [isPlaying, setIsPlaying] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolumeState] = useState(0.7);
  const [playingSurah, setPlayingSurah] = useState<number | null>(null);
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);

  const audioRef = useRef<HTMLAudioElement | null>(null);

  // Use refs for values needed inside event handlers to avoid stale closures
  const playingSurahRef = useRef(playingSurah);
  const selectedReciterRef = useRef(selectedReciter);
  const surahsRef = useRef(surahs);
  const isPlayingRef = useRef(isPlaying);
  const durationRef = useRef(duration);
  const currentTimeRef = useRef(currentTime);
  const volumeRef = useRef(volume);

  // Keep refs in sync with state
  useEffect(() => { playingSurahRef.current = playingSurah; }, [playingSurah]);
  useEffect(() => { selectedReciterRef.current = selectedReciter; }, [selectedReciter]);
  useEffect(() => { surahsRef.current = surahs; }, [surahs]);
  useEffect(() => { isPlayingRef.current = isPlaying; }, [isPlaying]);
  useEffect(() => { durationRef.current = duration; }, [duration]);
  useEffect(() => { currentTimeRef.current = currentTime; }, [currentTime]);
  useEffect(() => { volumeRef.current = volume; }, [volume]);

  // Audio play function
  const playAudio = useCallback(async (reciterId: string, surahNumber: number, surahName: string) => {
    try {
      setIsLoading(true);

      const audioUrl = await getValidAudioUrl(reciterId, surahNumber);
      if (!audioUrl) {
        throw new Error('لم يتم العثور على رابط صوتي صالح');
      }

      const reciter = getReciterById(reciterId);
      const reciterName = reciter?.arabic_name || 'قارئ غير معروف';

      if (audioRef.current) {
        audioRef.current.src = audioUrl;
        await audioRef.current.play();

        setSelectedReciter(reciter || null);
        setPlayingSurah(surahNumber);
        setIsPlaying(true);

        toast.success(`تم تشغيل ${surahName} بصوت ${reciterName}`, {
          duration: 3000,
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', error);
      toast.error('فشل في تشغيل الصوت. يرجى المحاولة مرة أخرى');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const togglePlayPause = useCallback(() => {
    if (!audioRef.current) return;

    if (isPlayingRef.current) {
      audioRef.current.pause();
    } else {
      audioRef.current.play();
    }
  }, []);

  const playNext = useCallback(() => {
    const surah = playingSurahRef.current;
    const reciter = selectedReciterRef.current;
    if (!surah || !reciter) return;

    const nextSurah = surah < 114 ? surah + 1 : 1;
    const surahName = surahsRef.current.find(s => s.number === nextSurah)?.name || '';
    playAudio(reciter.id, nextSurah, surahName);
  }, [playAudio]);

  const playPrevious = useCallback(() => {
    const surah = playingSurahRef.current;
    const reciter = selectedReciterRef.current;
    if (!surah || !reciter) return;

    const previousSurah = surah > 1 ? surah - 1 : 114;
    const surahName = surahsRef.current.find(s => s.number === previousSurah)?.name || '';
    playAudio(reciter.id, previousSurah, surahName);
  }, [playAudio]);

  const setVolume = useCallback((newVolume: number) => {
    const clampedVolume = Math.max(0, Math.min(1, newVolume));
    setVolumeState(clampedVolume);

    if (audioRef.current) {
      audioRef.current.volume = clampedVolume;
    }

    localStorage.setItem('quran-audio-volume', clampedVolume.toString());
  }, []);

  const seek = useCallback((time: number) => {
    if (audioRef.current && durationRef.current > 0) {
      audioRef.current.currentTime = time;
      setCurrentTime(time);
    }
  }, []);

  const setReciter = useCallback((reciterId: string) => {
    setReciters(prevReciters => {
      const reciter = prevReciters.find(r => r.id === reciterId);
      if (reciter) {
        setSelectedReciter(reciter);

        if (playingSurahRef.current !== null && audioRef.current) {
          audioRef.current.pause();
          setPlayingSurah(null);
          setIsPlaying(false);
          setCurrentTime(0);
          toast.success(`تم تغيير القارئ إلى ${reciter.arabic_name}`);
        }
      }
      return prevReciters;
    });
  }, []);

  const jumpToSurah = useCallback((surahNumber: number) => {
    const reciter = selectedReciterRef.current;
    if (reciter && surahNumber >= 1 && surahNumber <= 114) {
      const surahName = surahsRef.current.find(s => s.number === surahNumber)?.name || '';
      playAudio(reciter.id, surahNumber, surahName);
    }
  }, [playAudio]);

  const autoPlayNext = useCallback(() => {
    const surah = playingSurahRef.current;
    const reciter = selectedReciterRef.current;

    if (surah && surah < 114 && reciter) {
      const nextSurah = surah + 1;
      const surahName = surahsRef.current.find(s => s.number === nextSurah)?.name || '';

      toast.success('انتهت السورة. سأقوم بتشغيل السورة التالية...', {
        duration: 3000,
        icon: '⏭️'
      });

      setTimeout(() => {
        playAudio(reciter.id, nextSurah, surahName);
      }, 2000);
    } else {
      setPlayingSurah(null);
      toast.success('تم انتهاء التلاوة. جزاك الله خيراً', {
        duration: 4000,
        icon: '🤲'
      });
    }
  }, [playAudio]);

  // Update Media Session metadata
  const updateMediaSession = useCallback(() => {
    if ('mediaSession' in navigator && playingSurahRef.current && selectedReciterRef.current) {
      const currentSurah = surahsRef.current.find(s => s.number === playingSurahRef.current);

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSurah?.name || `سورة رقم ${playingSurahRef.current}`,
        artist: selectedReciterRef.current.arabic_name,
        album: 'القرآن الكريم',
        artwork: [
          { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' }
        ]
      });

      navigator.mediaSession.playbackState = isPlayingRef.current ? 'playing' : 'paused';

      if (audioRef.current && durationRef.current > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: durationRef.current,
            playbackRate: audioRef.current.playbackRate,
            position: currentTimeRef.current
          });
        } catch {
          // Media Session position update failed silently
        }
      }
    }
  }, []);

  // Initialize audio and data
  useEffect(() => {
    const initializeAudio = async () => {
      // Load surahs and reciters
      try {
        const surahsData = await fetchSurahs();
        setSurahs(surahsData);

        const sortedReciters = [...famousReciters].sort((a, b) =>
          a.arabic_name.localeCompare(b.arabic_name, 'ar')
        );
        setReciters(sortedReciters);

        if (sortedReciters.length > 0) {
          setSelectedReciter(sortedReciters[0]);
        }
      } catch (error) {
        console.error('Error loading data:', error);
        toast.error('حدث خطأ أثناء تحميل البيانات');
      }

      // Create and configure audio element
      const audio = new Audio();

      // Restore saved volume
      const savedVolume = localStorage.getItem('quran-audio-volume');
      const initialVolume = savedVolume ? parseFloat(savedVolume) : 0.7;
      audio.volume = initialVolume;
      setVolumeState(initialVolume);

      audio.preload = 'none';
      audio.setAttribute('playsinline', '');

      // Audio event handlers
      const handleLoadStart = () => setIsLoading(true);
      const handleCanPlay = () => setIsLoading(false);

      const handleTimeUpdate = () => {
        setCurrentTime(audio.currentTime);
        updateMediaSession();
      };

      const handleLoadedMetadata = () => {
        setDuration(audio.duration);
        updateMediaSession();
      };

      const handlePlay = () => {
        setIsPlaying(true);
        updateMediaSession();
      };

      const handlePause = () => {
        setIsPlaying(false);
        updateMediaSession();
      };

      const handleEnded = () => {
        setCurrentTime(0);
        setIsPlaying(false);
        autoPlayNext();
      };

      const handleError = (e: Event) => {
        const target = e.target as HTMLAudioElement;
        console.error('Audio error:', target?.error);
        setIsLoading(false);
        setIsPlaying(false);

        const errorCode = target?.error?.code;
        let errorMessage = 'حدث خطأ أثناء تشغيل الصوت';

        if (errorCode === 4) {
          errorMessage = 'تعذر تشغيل الملف الصوتي. جرب قارئ آخر';
        } else if (errorCode === 2) {
          errorMessage = 'خطأ في الشبكة. تحقق من اتصالك بالإنترنت';
        }

        toast.error(errorMessage);
      };

      // Add event listeners
      audio.addEventListener('loadstart', handleLoadStart);
      audio.addEventListener('canplay', handleCanPlay);
      audio.addEventListener('timeupdate', handleTimeUpdate);
      audio.addEventListener('loadedmetadata', handleLoadedMetadata);
      audio.addEventListener('play', handlePlay);
      audio.addEventListener('pause', handlePause);
      audio.addEventListener('ended', handleEnded);
      audio.addEventListener('error', handleError);

      audioRef.current = audio;

      // Setup Media Session API
      if ('mediaSession' in navigator) {
        navigator.mediaSession.setActionHandler('play', () => {
          audioRef.current?.play();
        });
        navigator.mediaSession.setActionHandler('pause', () => {
          audioRef.current?.pause();
        });
        navigator.mediaSession.setActionHandler('previoustrack', () => {
          playPrevious();
        });
        navigator.mediaSession.setActionHandler('nexttrack', () => {
          playNext();
        });
        navigator.mediaSession.setActionHandler('seekto', (details) => {
          if (audioRef.current && details.seekTime) {
            audioRef.current.currentTime = details.seekTime;
          }
        });
      }

      // Setup keyboard shortcuts
      const handleKeyDown = (e: KeyboardEvent) => {
        if (document.activeElement?.tagName === 'INPUT' ||
          document.activeElement?.tagName === 'TEXTAREA') {
          return;
        }

        switch (e.code) {
          case 'Space':
            e.preventDefault();
            togglePlayPause();
            break;
          case 'ArrowRight':
            if (e.ctrlKey) {
              e.preventDefault();
              playNext();
            }
            break;
          case 'ArrowLeft':
            if (e.ctrlKey) {
              e.preventDefault();
              playPrevious();
            }
            break;
          case 'ArrowUp':
            if (e.ctrlKey) {
              e.preventDefault();
              setVolume(Math.min(1, volumeRef.current + 0.1));
            }
            break;
          case 'ArrowDown':
            if (e.ctrlKey) {
              e.preventDefault();
              setVolume(Math.max(0, volumeRef.current - 0.1));
            }
            break;
        }
      };

      document.addEventListener('keydown', handleKeyDown);

      // Cleanup
      return () => {
        if (audio) {
          audio.removeEventListener('loadstart', handleLoadStart);
          audio.removeEventListener('canplay', handleCanPlay);
          audio.removeEventListener('timeupdate', handleTimeUpdate);
          audio.removeEventListener('loadedmetadata', handleLoadedMetadata);
          audio.removeEventListener('play', handlePlay);
          audio.removeEventListener('pause', handlePause);
          audio.removeEventListener('ended', handleEnded);
          audio.removeEventListener('error', handleError);
          audio.pause();
          audio.src = '';
        }
        document.removeEventListener('keydown', handleKeyDown);
      };
    };

    initializeAudio();
  }, [autoPlayNext, playNext, playPrevious, togglePlayPause, setVolume, updateMediaSession]);

  const contextValue: AudioContextType = {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    playingSurah,
    selectedReciter,
    surahs,
    reciters,
    playAudio,
    togglePlayPause,
    playNext,
    playPrevious,
    setVolume,
    seek,
    setReciter,
    jumpToSurah
  };

  return (
    <AudioContext.Provider value={contextValue}>
      {children}
    </AudioContext.Provider>
  );
};