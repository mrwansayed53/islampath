import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { Surah } from '../types';
import { fetchSurahs, testAudioUrl } from '../api/quranApi';
import { getReciters } from '../services/supabase';
import {
  famousReciters,
  getAudioUrl,
  getFallbackAudioUrls,
  validateAudioUrl,
  getValidAudioUrl,
  getReciterById
} from '../data/reciters';
import { Headphones, Play, Pause, Download, Search, Volume2, SkipBack, SkipForward, Loader2, StopCircle } from 'lucide-react';
import toast from 'react-hot-toast';

interface Reciter {
  id: string;
  name: string;
  arabic_name: string;
  audio_base_url: string;
  description?: string;
  zip_url?: string;
}

// إضافة دالة مساعدة لتطبيع النص العربي وإزالة التشكيل
function normalizeArabic(text: string): string {
  return text
    // إزالة التشكيل وعلامات التشكيل
    .replace(/[\u064B-\u0652\u0670\u0640]/g, '')
    // توحيد أشكال الألف
    .replace(/[إأآ]/g, 'ا')
    // توحيد الياء والألف المقصورة
    .replace(/ى/g, 'ي')
    // توحيد الهمزات على السطر
    .replace(/ؤ/g, 'و')
    .replace(/ئ/g, 'ي')
    // إزالة المسافات الزائدة وتحويل للنص الأصغر
    .trim()
    .toLowerCase();
}

const AudioQuranPage: React.FC = () => {
  const [surahs, setSurahs] = useState<Surah[]>([]);
  const [filteredSurahs, setFilteredSurahs] = useState<Surah[]>([]);
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [playingSurah, setPlayingSurah] = useState<number | null>(null);
  const [audioElement, setAudioElement] = useState<HTMLAudioElement | null>(null);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(0.7);
  const [isLoading, setIsLoading] = useState(false);
  const [isPlaying, setIsPlaying] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // حالة حقل إدخال رقم السورة للتنقل السريع
  const [surahInput, setSurahInput] = useState<string>('');
  // حالة تحميل جميع السور
  const [isDownloadingAll, setIsDownloadingAll] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState<string>('');
  const stopDownloadRef = React.useRef(false);

  // مزامنة حقل الإدخال مع السورة الحالية عند التغيير
  useEffect(() => {
    if (playingSurah) {
      setSurahInput(playingSurah.toString());
    }
  }, [playingSurah]);

  // Fetch surahs and reciters on component mount
  useEffect(() => {
    const loadData = async () => {
      setLoading(true);
      try {
        const surahsData = await fetchSurahs();
        setSurahs(surahsData);
        setFilteredSurahs(surahsData);

        // استخدام قائمة القراء الموحدة فقط لتجنب التضارب
        // ترتيب القراء حسب الاسم العربي
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
      } finally {
        setLoading(false);
      }
    };

    loadData();

    // Create audio element with better configuration
    const audio = new Audio();

    // Restore saved volume or use default
    const savedVolume = localStorage.getItem('quran-audio-volume');
    audio.volume = savedVolume ? parseFloat(savedVolume) : 0.7;
    setVolume(audio.volume);

    audio.preload = 'none'; // Don't preload to avoid CORS issues

    // Remove crossOrigin to avoid CORS issues
    // audio.crossOrigin = 'anonymous';

    // Enable background audio playback
    audio.setAttribute('playsinline', '');

    // Prevent audio from being paused when page visibility changes
    const handleVisibilityChange = () => {
      if (document.hidden && audio && !audio.paused) {
        // Keep playing in background
        console.log('Page hidden, continuing audio playback');
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Initialize Media Session API for background audio control
    if ('mediaSession' in navigator) {
      console.log('Media Session API supported');
    }

    const handleLoadStart = () => setIsLoading(true);
    const handleCanPlay = () => setIsLoading(false);
    const handleTimeUpdate = () => {
      setCurrentTime(audio.currentTime);
      // Update Media Session position
      if ('mediaSession' in navigator && duration > 0) {
        try {
          navigator.mediaSession.setPositionState({
            duration: duration,
            playbackRate: audio.playbackRate,
            position: audio.currentTime
          });
        } catch (error) {
          console.log('Media Session position update failed:', error);
        }
      }
    };
    const handleLoadedMetadata = () => setDuration(audio.duration);
    const handlePlay = () => {
      setIsPlaying(true);
      updateMediaSessionMetadata();
    };
    const handlePause = () => {
      setIsPlaying(false);
      updateMediaSessionMetadata();
    };
    const handleEnded = () => {
      setCurrentTime(0);
      setIsPlaying(false);

      // Auto-play next surah if available
      if (playingSurah && playingSurah < 114 && selectedReciter) {
        toast.success('انتهت السورة. سأقوم بتشغيل السورة التالية...', {
          duration: 3000,
          icon: '⏭️'
        });
        setTimeout(() => {
          handleAutoNext();
        }, 2000);
      } else {
        setPlayingSurah(null);
        toast.success('تم انتهاء التلاوة. جزاك الله خيراً', {
          duration: 4000,
          icon: '🤲'
        });
      }
    };
    const handleError = (e: any) => {
      console.error('Audio error:', {
        type: e.type,
        error: e.target?.error,
        networkState: e.target?.networkState,
        readyState: e.target?.readyState,
        src: e.target?.src
      });
      setIsLoading(false);
      setPlayingSurah(null);
      setIsPlaying(false);

      // Show user-friendly error message
      const errorCode = e.target?.error?.code;
      let errorMessage = 'حدث خطأ أثناء تشغيل الصوت';

      if (errorCode === 4) { // MEDIA_ERR_SRC_NOT_SUPPORTED
        errorMessage = 'تعذر تشغيل الملف الصوتي. جرب قارئ آخر أو حاول مرة أخرى لاحقاً';
      } else if (errorCode === 2) { // MEDIA_ERR_NETWORK
        errorMessage = 'خطأ في الشبكة. تحقق من اتصالك بالإنترنت';
      } else if (errorCode === 3) { // MEDIA_ERR_DECODE
        errorMessage = 'تعذر فك تشفير الملف الصوتي. جرب قارئ آخر';
      }

      toast.error(errorMessage);
    };

    audio.addEventListener('loadstart', handleLoadStart);
    audio.addEventListener('canplay', handleCanPlay);
    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('loadedmetadata', handleLoadedMetadata);
    audio.addEventListener('play', handlePlay);
    audio.addEventListener('pause', handlePause);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('error', handleError);

    setAudioElement(audio);

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
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, []);

  // Handle search query changes (مع تجاهل التشكيل)
  useEffect(() => {
    const query = normalizeArabic(searchQuery);

    if (query === '') {
      setFilteredSurahs(surahs);
    } else {
      const filtered = surahs.filter((surah) => {
        const normalizedName = normalizeArabic(surah.name);
        const normalizedEnglish = surah.englishName.toLowerCase();
        return (
          normalizedName.includes(query) ||
          normalizedEnglish.includes(query) ||
          surah.number.toString() === query
        );
      });
      setFilteredSurahs(filtered);
    }
  }, [searchQuery, surahs]);

  // Get multiple audio URLs for surah (with fallbacks)
  const getAudioUrls = (surahNumber: number, reciter: Reciter) => {
    const formattedSurahNumber = surahNumber.toString().padStart(3, '0');
    const baseUrl = reciter.audio_base_url;

    // روابط أساسية
    const urls = [
      `${baseUrl}/${formattedSurahNumber}.mp3`,
      `${baseUrl}/${surahNumber}.mp3`
    ];

    // إضافة روابط بديلة حسب القارئ (أسماء محدثة)
    switch (reciter.id) {
      case 'mishari_alafasy':
        urls.push(
          `https://everyayah.com/data/Alafasy_128kbps/${formattedSurahNumber}.mp3`,
          `https://audio.qurancdn.com/Alafasy_128kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surahNumber}.mp3`
        );
        break;

      case 'husary':
        urls.push(
          `https://everyayah.com/data/Husary_128kbps/${formattedSurahNumber}.mp3`,
          `https://audio.qurancdn.com/Husary_128kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.husary/${surahNumber}.mp3`
        );
        break;

      case 'abdul_basit':
        urls.push(
          `https://everyayah.com/data/Abdul_Basit_Murattal_64kbps/${formattedSurahNumber}.mp3`,
          `https://audio.qurancdn.com/Abdul_Basit_Murattal_192kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.abdulbasitmurattal/${surahNumber}.mp3`
        );
        break;

      case 'minshawi':
        urls.push(
          `https://everyayah.com/data/Minshawi_Murattal_128kbps/${formattedSurahNumber}.mp3`,
          `https://audio.qurancdn.com/Minshawi_Murattal_128kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.minshawi/${surahNumber}.mp3`
        );
        break;

      case 'abdurrahman_sudais':
        urls.push(
          `https://audio.qurancdn.com/Sudais_128kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.abdurrahmaansudais/${surahNumber}.mp3`
        );
        break;

      case 'saud_alshuraim':
        urls.push(
          `https://audio.qurancdn.com/Shuraim_128kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.saoodshuraym/${surahNumber}.mp3`
        );
        break;

      case 'saad_alghamdi':
        urls.push(
          `https://audio.qurancdn.com/Ghamdi_40kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.saadalghamdi/${surahNumber}.mp3`
        );
        break;

      case 'maher_almuaiqly':
        urls.push(
          `https://audio.qurancdn.com/Maher_AlMuaiqly_64kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.maheralmuaiqly/${surahNumber}.mp3`
        );
        break;

      case 'yasser_aldosari':
        urls.push(
          `https://audio.qurancdn.com/Yasser_Ad-Dussary_128kbps/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.yasserdussary/${surahNumber}.mp3`
        );
        break;

      case 'ahmad_alajmi':
        urls.push(
          `https://audio.qurancdn.com/Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net/${formattedSurahNumber}.mp3`,
          `https://everyayah.com/data/Ahmed_ibn_Ali_al-Ajamy_128kbps_ketaballah.net/${formattedSurahNumber}.mp3`
        );
        break;

      case 'khaled_aljalil':
        urls.push(
          `https://server11.mp3quran.net/jalil/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.khaledjalil/${surahNumber}.mp3`
        );
        break;

      case 'abdullah_basfar':
        urls.push(
          `https://server7.mp3quran.net/basfer/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.abdullahbasfar/${surahNumber}.mp3`
        );
        break;

      case 'fahd_alkandari':
        urls.push(
          `https://server8.mp3quran.net/kndri/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.fahdalkandari/${surahNumber}.mp3`
        );
        break;

      case 'muhammad_ayyub':
        urls.push(
          `https://server10.mp3quran.net/ayyub/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.muhammadayyub/${surahNumber}.mp3`
        );
        break;

      case 'ali_jaber':
        urls.push(
          `https://server13.mp3quran.net/jaber/${formattedSurahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.alijaber/${surahNumber}.mp3`
        );
        break;

      default:
        // للقراء الآخرين، إضافة روابط احتياطية موثوقة
        urls.push(
          `https://cdn.islamic.network/quran/audio/128/ar.husary/${surahNumber}.mp3`,
          `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surahNumber}.mp3`,
          `https://server13.mp3quran.net/husr/${formattedSurahNumber}.mp3`
        );
        break;
    }

    return urls;
  };

  const playAudio = async (reciterId: string, surahNumber: number, surahName: string) => {
    try {
      setIsLoading(true);
      setError(null);

      // البحث عن أفضل رابط صوتي متوفر
      const audioUrl = await getValidAudioUrl(reciterId, surahNumber);

      if (!audioUrl) {
        throw new Error('لم يتم العثور على رابط صوتي صالح');
      }

      const reciter = getReciterById(reciterId);
      const reciterName = reciter?.arabic_name || 'قارئ غير معروف';

      console.log(`▶ تشغيل السورة: ${surahName}`);
      console.log(`📖 القارئ: ${reciterName}`);
      console.log(`🔗 الرابط: ${audioUrl}`);

      if (audioElement) {
        audioElement.src = audioUrl;
        await audioElement.play();

        setSelectedReciter(reciter || null);
        setPlayingSurah(surahNumber);
        setIsPlaying(true);

        // Update Media Session metadata
        updateMediaSessionMetadata(surahName, reciterName);

        // رسالة نجح التشغيل
        toast.success(`تم تشغيل ${surahName} بصوت ${reciterName}`, {
          duration: 3000,
          position: 'top-center',
        });
      }
    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', error);

      // محاولة استخدام الرابط الاحتياطي العام
      try {
        const fallbackUrl = `https://server13.mp3quran.net/husr/${surahNumber.toString().padStart(3, '0')}.mp3`;

        if (audioElement) {
          audioElement.src = fallbackUrl;
          await audioElement.play();

          const husaryReciter = getReciterById('husary');
          setSelectedReciter(husaryReciter || null);
          setPlayingSurah(surahNumber);
          setIsPlaying(true);

          toast(`تم التبديل إلى رابط احتياطي - ${surahName} بصوت الحصري`, {
            duration: 4000,
            position: 'top-center',
            icon: '⚠️',
            style: {
              background: '#f59e0b',
              color: '#fff',
            },
          });
        }
      } catch (fallbackError) {
        console.error('فشل في الرابط الاحتياطي:', fallbackError);
        setError('فشل في تحميل الملف الصوتي. يرجى المحاولة مرة أخرى لاحقاً.');

        toast.error('فشل في تشغيل الصوت. يرجى المحاولة مرة أخرى', {
          duration: 4000,
          position: 'top-center',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // دالة محسنة للتحقق من حالة الرابط الصوتي
  const checkAudioHealth = async (reciterId: string, surahNumber: number) => {
    try {
      const reciter = getReciterById(reciterId);
      if (!reciter) return false;

      // تجربة الرابط الأساسي
      const primaryUrl = getAudioUrl(reciterId, surahNumber);
      if (await validateAudioUrl(primaryUrl)) {
        return true;
      }

      // تجربة الروابط الاحتياطية
      const fallbackUrls = getFallbackAudioUrls(reciterId, surahNumber);
      for (const url of fallbackUrls) {
        if (await validateAudioUrl(url)) {
          return true;
        }
      }

      return false;
    } catch {
      return false;
    }
  };

  // Handle reciter change
  const handleReciterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const reciterId = e.target.value;
    const reciter = reciters.find(r => r.id === reciterId);
    if (reciter) {
      setSelectedReciter(reciter);

      // If currently playing, stop and reset
      if (playingSurah !== null && audioElement) {
        audioElement.pause();
        setPlayingSurah(null);
        setIsPlaying(false);
        setCurrentTime(0);
        toast.success(`تم تغيير القارئ إلى ${reciter.arabic_name}`);
      }
    }
  };

  // Handle download with better approach
  const handleDownload = (surahNumber: number, surahName: string) => {
    if (!selectedReciter) return;

    const audioUrls = getAudioUrls(surahNumber, selectedReciter);
    const primaryUrl = audioUrls[0]; // استخدم الرابط الأساسي للتحميل

    // Use window.open for better compatibility
    window.open(primaryUrl, '_blank');
    toast.success(`جاري تحميل سورة ${surahName}`);
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!audioElement || duration === 0) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const seekPosition = (e.clientX - rect.left) / rect.width;
    const newTime = seekPosition * duration;

    audioElement.currentTime = newTime;
    setCurrentTime(newTime);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);

    if (audioElement) {
      audioElement.volume = newVolume;
      // Store volume preference for background play
      localStorage.setItem('quran-audio-volume', newVolume.toString());
    }
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get next/previous surah with enhanced logic
  const getNextSurah = (current?: number) => {
    const surahNum = current || playingSurah;
    if (!surahNum) return null;
    return surahNum < 114 ? surahNum + 1 : 1;
  };

  const getPreviousSurah = (current?: number) => {
    const surahNum = current || playingSurah;
    if (!surahNum) return null;
    return surahNum > 1 ? surahNum - 1 : 114;
  };

  // Enhanced next/previous with better feedback
  const playNext = async () => {
    const nextSurah = getNextSurah();
    if (nextSurah && selectedReciter) {
      const surahName = surahs.find(s => s.number === nextSurah)?.name || '';
      toast.success(`التالية: ${surahName}`, { duration: 2000 });
      await playAudio(selectedReciter.id, nextSurah, surahName);
    }
  };

  const playPrevious = async () => {
    const previousSurah = getPreviousSurah();
    if (previousSurah && selectedReciter) {
      const surahName = surahs.find(s => s.number === previousSurah)?.name || '';
      toast.success(`السابقة: ${surahName}`, { duration: 2000 });
      await playAudio(selectedReciter.id, previousSurah, surahName);
    }
  };

  // Jump to specific surah number
  const jumpToSurah = async (surahNumber: number) => {
    if (selectedReciter && surahNumber >= 1 && surahNumber <= 114) {
      const surahName = surahs.find(s => s.number === surahNumber)?.name || '';
      await playAudio(selectedReciter.id, surahNumber, surahName);
    }
  };

  // Update Media Session metadata and controls
  const updateMediaSessionMetadata = (surahName?: string, reciterName?: string) => {
    if ('mediaSession' in navigator) {
      const currentSurah = surahName || (playingSurah ? surahs.find(s => s.number === playingSurah)?.name || '' : '');
      const currentReciter = reciterName || selectedReciter?.arabic_name || '';

      navigator.mediaSession.metadata = new MediaMetadata({
        title: currentSurah,
        artist: currentReciter,
        album: 'القرآن الكريم',
        artwork: [
          { src: '/favicon.ico', sizes: '96x96', type: 'image/x-icon' }
        ]
      });

      // Set playback state
      navigator.mediaSession.playbackState = isPlaying ? 'playing' : 'paused';

      // Setup action handlers
      navigator.mediaSession.setActionHandler('play', () => {
        if (audioElement && playingSurah) {
          audioElement.play();
        }
      });

      navigator.mediaSession.setActionHandler('pause', () => {
        if (audioElement) {
          audioElement.pause();
        }
      });

      navigator.mediaSession.setActionHandler('previoustrack', () => {
        playPrevious();
      });

      navigator.mediaSession.setActionHandler('nexttrack', () => {
        playNext();
      });

      navigator.mediaSession.setActionHandler('seekto', (details) => {
        if (audioElement && details.seekTime) {
          audioElement.currentTime = details.seekTime;
        }
      });

      // Update position state
      if (audioElement && duration > 0) {
        navigator.mediaSession.setPositionState({
          duration: duration,
          playbackRate: audioElement.playbackRate,
          position: currentTime
        });
      }
    }
  };

  // Auto-play next surah when current ends
  const handleAutoNext = () => {
    if (playingSurah && playingSurah < 114) {
      const nextSurah = getNextSurah();
      if (nextSurah && selectedReciter) {
        const surahName = surahs.find(s => s.number === nextSurah)?.name || '';
        toast(`تشغيل تلقائي: ${surahName}`, {
          duration: 3000,
          icon: '▶️'
        });
        setTimeout(() => {
          playAudio(selectedReciter.id, nextSurah, surahName);
        }, 2000);
      }
    }
  };

  // دالة للتحكم في التشغيل والإيقاف
  const togglePlayPause = async (surahNumber: number, surahName: string) => {
    if (!selectedReciter) return;

    // إذا كانت السورة الحالية تعمل، أوقفها
    if (playingSurah === surahNumber && isPlaying) {
      if (audioElement) {
        audioElement.pause();
        setIsPlaying(false);
        toast.success(`تم إيقاف ${surahName}`, {
          duration: 2000,
          position: 'top-center',
        });
      }
    }
    // إذا كانت السورة الحالية متوقفة، شغلها
    else if (playingSurah === surahNumber && !isPlaying) {
      if (audioElement) {
        try {
          await audioElement.play();
          setIsPlaying(true);
          toast.success(`تم استئناف ${surahName}`, {
            duration: 2000,
            position: 'top-center',
          });
        } catch (error) {
          console.error('خطأ في استئناف التشغيل:', error);
          // إذا فشل الاستئناف، شغل من جديد
          await playAudio(selectedReciter.id, surahNumber, surahName);
        }
      }
    }
    // إذا كانت سورة مختلفة، شغل السورة الجديدة
    else {
      await playAudio(selectedReciter.id, surahNumber, surahName);
    }
  };



  // Handle download all surahs as MP3
  const handleDownloadAllSurahs = async () => {
    if (!selectedReciter) return;

    // confirm
    if (!window.confirm(`هل تريد بدء تحميل جميع سور المصحف (114 سورة) بصيغة MP3؟\nسيتم فتح نوافذ التحميل تباعاً. يرجى السماح للموقع بفتح النوافذ المنبثقة.`)) {
      return;
    }

    setIsDownloadingAll(true);
    stopDownloadRef.current = false;

    toast.success('بدأ تحميل المصحف كاملاً...');

    for (let i = 1; i <= 114; i++) {
      if (stopDownloadRef.current) {
        toast('تم إيقاف التحميل', { icon: '🛑' });
        break;
      }

      const surah = surahs.find(s => s.number === i);
      const name = surah?.name || `سورة ${i}`;
      setDownloadProgress(`جاري تحميل: ${name} (${i}/114)`);

      try {
        // استخدام نفس منطق التحميل الفردي
        const audioUrls = getAudioUrls(i, selectedReciter);
        const primaryUrl = audioUrls[0];

        // استخدام Fetch لتحميل الملف كـ Blob ثم حفظه
        // هذا يضمن نزول الملف كتحميل رغماً عن المتصفح ويتجاوز مانع النوافذ المنبثقة
        const response = await fetch(primaryUrl);
        if (!response.ok) throw new Error('Network response was not ok');

        const blob = await response.blob();
        const url = window.URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.style.display = 'none';
        a.href = url;
        // تسمية الملف باسم السورة
        a.download = `${(i).toString().padStart(3, '0')}_${selectedReciter.id}.mp3`;
        document.body.appendChild(a);
        a.click();

        // تنظيف
        window.URL.revokeObjectURL(url);
        document.body.removeChild(a);

        // انتظار بسيط لعدم إرهاق المتصفح
        await new Promise(resolve => setTimeout(resolve, 500));

      } catch (e) {
        console.error(`Error downloading surah ${i}`, e);
        // محاولة طريقة بديلة في حال فشل الـ Fetch (CORS issue etc)
        try {
          const audioUrls = getAudioUrls(i, selectedReciter);
          const win = window.open(audioUrls[0], '_blank');
        } catch (err) {
          console.error('Fallback failed', err);
        }
      }
    }

    setIsDownloadingAll(false);
    setDownloadProgress('');
    if (!stopDownloadRef.current) {
      toast.success('تم الانتهاء من طلب تحميل جميع السور');
    }
  };

  const handleStopDownload = () => {
    stopDownloadRef.current = true;
    setIsDownloadingAll(false);
  };

  return (
    <>
      <SEO title="المصحف المسموع" description="استمع إلى القرآن الكريم بأصوات مجموعة من القراء مع إمكانية التحميل." />
      <div className="min-h-screen bg-gradient-to-br">
        <div className="fade-in">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-400 mb-2 font-amiri">
              المصحف المسموع
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-noto-arabic">
              استمع إلى القرآن الكريم بأصوات أشهر القراء في العالم الإسلامي
            </p>
          </div>

          {/* Enhanced Audio Player Controls */}
          {playingSurah && (
            <div className="bg-gradient-to-r from-emerald-50 to-emerald-100 dark:from-emerald-900/30 dark:to-emerald-800/30 rounded-xl shadow-lg p-6 mb-6 sticky top-4 z-10 border border-emerald-200 dark:border-emerald-700">
              <div className="flex items-center justify-between mb-4">
                <div className="flex items-center">
                  <div className="bg-emerald-600 text-white rounded-full w-12 h-12 flex items-center justify-center ml-4 shadow-md">
                    <span className="text-lg font-bold">{playingSurah}</span>
                  </div>
                  <div>
                    <h3 className="font-amiri text-xl font-bold text-emerald-800 dark:text-emerald-400">
                      {surahs.find(s => s.number === playingSurah)?.name}
                    </h3>
                    <p className="text-sm text-emerald-600 dark:text-emerald-500">
                      {selectedReciter?.arabic_name}
                    </p>
                  </div>
                </div>

                <div className="flex items-center space-x-3">
                  <button
                    onClick={playPrevious}
                    className="p-3 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-md"
                    title={`السورة السابقة: ${surahs.find(s => s.number === getPreviousSurah())?.name || ''}`}
                  >
                    <SkipForward className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                  </button>

                  <button
                    onClick={() => togglePlayPause(playingSurah, surahs.find(s => s.number === playingSurah)?.name || '')}
                    disabled={isLoading}
                    className="p-4 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-lg transform hover:scale-105"
                  >
                    {isLoading ? (
                      <Loader2 className="w-6 h-6 animate-spin" />
                    ) : isPlaying ? (
                      <Pause className="w-6 h-6" />
                    ) : (
                      <Play className="w-6 h-6" />
                    )}
                  </button>

                  <button
                    onClick={playNext}
                    className="p-3 rounded-full bg-white dark:bg-gray-800 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors shadow-md"
                    title={`السورة التالية: ${surahs.find(s => s.number === getNextSurah())?.name || ''}`}
                  >
                    <SkipBack className="w-5 h-5 text-emerald-600 dark:text-emerald-500" />
                  </button>
                </div>
              </div>

              {/* شريط تنقل السور */}
              <div className="audio-navigation mb-4 flex items-center justify-center gap-4">
                <button
                  onClick={playPrevious}
                  disabled={!playingSurah}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-500 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800 disabled:opacity-50"
                >
                  ← السابقة
                </button>
                <div className="flex items-center gap-2">
                  <input
                    type="number"
                    min="1"
                    max="114"
                    value={surahInput}
                    onChange={(e) => setSurahInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        const num = parseInt(surahInput);
                        if (!isNaN(num) && num >= 1 && num <= 114) {
                          jumpToSurah(num);
                        }
                      }
                    }}
                    className="w-20 p-2 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-500 text-gray-900 dark:text-gray-100 rounded text-center"
                  />
                  <span className="text-gray-700 dark:text-gray-300">/ 114</span>
                </div>
                <button
                  onClick={playNext}
                  disabled={!playingSurah}
                  className="px-4 py-2 bg-white dark:bg-gray-800 border border-emerald-300 dark:border-emerald-500 rounded hover:bg-emerald-100 dark:hover:bg-emerald-800 disabled:opacity-50"
                >
                  التالية →
                </button>
              </div>

              {/* Progress Bar */}
              <div className="flex items-center space-x-3 mb-4">
                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium ml-2 min-w-[45px]">
                  {formatTime(currentTime)}
                </span>

                <div
                  className="flex-1 h-3 bg-emerald-200 dark:bg-emerald-800 rounded-full overflow-hidden cursor-pointer shadow-inner"
                  onClick={handleSeek}
                >
                  <div
                    className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-100 rounded-full"
                    style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
                  />
                </div>

                <span className="text-sm text-emerald-700 dark:text-emerald-400 font-medium min-w-[45px]">
                  {duration > 0 ? formatTime(duration) : '--:--'}
                </span>
              </div>

              {/* Volume Control */}
              <div className="flex items-center justify-center">
                <Volume2 className="w-5 h-5 text-emerald-600 dark:text-emerald-500 ml-3" />
                <input
                  type="range"
                  min="0"
                  max="1"
                  step="0.01"
                  value={volume}
                  onChange={handleVolumeChange}
                  className="w-32 accent-emerald-600"
                />
                <span className="text-sm text-emerald-600 dark:text-emerald-500 mr-2 min-w-[35px]">
                  {Math.round(volume * 100)}%
                </span>
              </div>
            </div>
          )}

          {/* Controls */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-6 mb-6 border border-gray-200 dark:border-gray-700">
            <div className="flex flex-col md:flex-row md:items-center gap-6">
              <div className="md:w-1/2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  اختر القارئ:
                </label>
                <select
                  value={selectedReciter?.id || ''}
                  onChange={handleReciterChange}
                  className="w-full p-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 transition-colors shadow-sm"
                >
                  {reciters.map(reciter => (
                    <option key={reciter.id} value={reciter.id}>
                      {reciter.arabic_name} {reciter.description && `- ${reciter.description}`}
                    </option>
                  ))}
                </select>


                <div className="flex gap-2 mt-3">
                  {!isDownloadingAll ? (
                    <button
                      onClick={handleDownloadAllSurahs}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors shadow-sm text-sm font-medium"
                      title="تحميل جميع سور المصحف (114 سورة) كملفات MP3"
                    >
                      <Download className="w-4 h-4 ml-2" />
                      تحميل المصحف كاملاً (MP3)
                    </button>
                  ) : (
                    <button
                      onClick={handleStopDownload}
                      className="flex-1 flex items-center justify-center px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 transition-colors shadow-sm text-sm font-medium animate-pulse"
                    >
                      <StopCircle className="w-4 h-4 ml-2" />
                      إيقاف التحميل ({downloadProgress})
                    </button>
                  )}
                </div>
              </div>

              <div className="md:w-1/2">
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  ابحث عن سورة:
                </label>
                <div className="relative">
                  <input
                    type="text"
                    placeholder="ابحث عن سورة..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-4 py-4 border border-gray-300 dark:border-gray-700 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 bg-white dark:bg-gray-800 text-gray-900 dark:text-gray-100 transition-colors shadow-sm"
                  />
                  <Search className="absolute top-4 left-4 w-5 h-5 text-gray-400" />
                </div>
              </div>
            </div>
          </div>

          {loading ? (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8">
              <div className="flex items-center justify-center">
                <Loader2 className="w-8 h-8 animate-spin text-emerald-600 ml-3" />
                <span className="text-gray-600 dark:text-gray-400">جاري تحميل السور...</span>
              </div>
            </div>
          ) : (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
                {filteredSurahs.map((surah) => (
                  <div
                    key={surah.number}
                    className={`border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer transform hover:scale-105 ${playingSurah === surah.number
                      ? 'border-emerald-500 bg-gradient-to-br from-emerald-50 to-emerald-100 dark:from-emerald-900/20 dark:to-emerald-800/20 shadow-lg'
                      : 'border-gray-200 dark:border-gray-700 hover:border-emerald-300 dark:hover:border-emerald-600 hover:bg-gray-50 dark:hover:bg-gray-700/50 shadow-md hover:shadow-lg'
                      }`}
                  >
                    <div className="flex justify-between items-start mb-4">
                      <div className="flex-1">
                        <h3 className="font-amiri text-xl font-bold text-gray-900 dark:text-gray-100 mb-1">
                          {surah.name}
                        </h3>
                        <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">
                          {surah.englishName} • {surah.numberOfAyahs} آية
                        </p>
                        <span className={`text-xs py-1 px-3 rounded-full inline-block ${surah.revelationType === 'Meccan'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                          }`}>
                          {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                        </span>
                      </div>
                      <div className={`rounded-full w-12 h-12 flex items-center justify-center shadow-md ${playingSurah === surah.number
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400'
                        }`}>
                        <span className="text-sm font-bold">{surah.number}</span>
                      </div>
                    </div>

                    <div className="flex justify-between items-center mt-6 gap-3">
                      <button
                        onClick={() => togglePlayPause(surah.number, surah.name)}
                        disabled={!selectedReciter || isLoading}
                        className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 flex-1 justify-center font-medium ${playingSurah === surah.number && isPlaying
                          ? 'bg-emerald-600 text-white hover:bg-emerald-700 shadow-md'
                          : 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-800 dark:text-emerald-400 hover:bg-emerald-200 dark:hover:bg-emerald-800/50'
                          }`}
                      >
                        {isLoading && playingSurah === surah.number ? (
                          <>
                            <Loader2 className="w-4 h-4 ml-2 animate-spin" />
                            <span>جاري التحميل...</span>
                          </>
                        ) : playingSurah === surah.number && isPlaying ? (
                          <>
                            <Pause className="w-4 h-4 ml-2" />
                            <span>إيقاف</span>
                          </>
                        ) : (
                          <>
                            <Play className="w-4 h-4 ml-2" />
                            <span>استماع</span>
                          </>
                        )}
                      </button>

                      <button
                        onClick={() => handleDownload(surah.number, surah.name)}
                        disabled={!selectedReciter}
                        className="flex items-center px-4 py-3 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors duration-200 disabled:opacity-50 shadow-sm"
                        title="تحميل السورة"
                      >
                        <Download className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {filteredSurahs.length === 0 && (
                <div className="text-center py-16">
                  <Headphones className="w-16 h-16 text-gray-300 dark:text-gray-600 mx-auto mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 dark:text-gray-100 mb-2">
                    لا توجد سور مطابقة لبحثك
                  </h3>
                  <p className="text-gray-500 dark:text-gray-400">
                    جرب البحث بكلمات أخرى أو تصفح جميع السور
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div >
    </>
  );
};

export default AudioQuranPage;