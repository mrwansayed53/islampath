import React, { useState, useEffect, useRef } from 'react';
import { Tafseer, Surah } from '../types';
import { fetchTafseer, fetchSurahs, fetchAyah } from '../api/quranApi';

import { famousReciters } from '../data/reciters';
import { Book, X, ChevronLeft, ChevronRight, Loader2, Volume2, Play, Pause } from 'lucide-react';
import toast from 'react-hot-toast';
import {
  getAudioUrl,
  getFallbackAudioUrls,

  getValidAudioUrl,
  getReciterById
} from '../data/reciters';

interface PageData {
  page: number;
  surah_name: string;
  juz: number;
  ayahs: Array<{
    text: string;
    surah: number;
    ayah: number;
    key: string;
  }>;
}

interface Reciter {
  id: string;
  name: string;
  arabic_name: string;
  audio_base_url: string;
  description?: string;
}

interface RealMushafReaderProps {
  loading?: boolean;
}

const RealMushafReader: React.FC<RealMushafReaderProps> = ({ loading = false }) => {
  // Request Notification permission on mount
  React.useEffect(() => {
    if ('Notification' in window && Notification.permission === 'default') {
      Notification.requestPermission();
    }
  }, []);

  // Helper to show notifications for surah events
  const showSurahNotification = (title: string, options: NotificationOptions, onClick?: () => void) => {
    if (!('Notification' in window)) return;
    if (Notification.permission === 'granted') {
      const notif = new Notification(title, options);
      if (onClick) notif.onclick = () => { window.focus(); onClick(); };
    } else if (Notification.permission !== 'denied') {
      Notification.requestPermission().then(permission => {
        if (permission === 'granted') {
          const notif = new Notification(title, options);
          if (onClick) notif.onclick = () => { window.focus(); onClick(); };
        }
      });
    }
  };

  const [currentPage, setCurrentPage] = useState(1);
  const [pageData, setPageData] = useState<PageData | null>(null);
  const [selectedAyah, setSelectedAyah] = useState<{ surah: number, ayah: number } | null>(null);
  const [tafseer, setTafseer] = useState<Tafseer | null>(null);
  const [tafseerLoading, setTafseerLoading] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [pageLoading, setPageLoading] = useState(false);

  // للصوت الخاص بالآيات الفردية
  const audioRef = useRef<HTMLAudioElement | null>(null);

  // للصوت الخاص بتشغيل السور كاملة
  const [reciters, setReciters] = useState<Reciter[]>([]);
  const [selectedReciter, setSelectedReciter] = useState<Reciter | null>(null);
  const [surahAudioRef, setSurahAudioRef] = useState<HTMLAudioElement | null>(null);
  const [isSurahPlaying, setIsSurahPlaying] = useState(false);
  const [currentSurah, setCurrentSurah] = useState<number | null>(null);
  const [surahAudioLoading, setSurahAudioLoading] = useState(false);
  const [showReciterSelector, setShowReciterSelector] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  // حالة قائمة اختيار الجزء
  const [showJuzSelector, setShowJuzSelector] = useState(false);
  // حالة حقل إدخال رقم الصفحة
  const [pageInput, setPageInput] = useState<string>(currentPage.toString());
  // قائمة وأزرار اختيار السور
  const [surahsList, setSurahsList] = useState<Surah[]>([]);
  const [showSurahSelector, setShowSurahSelector] = useState(false);

  const getRevelationTypeArabic = (type: string) => {
    const lowerType = type.toLowerCase();
    if (lowerType === 'meccan') return 'مكية';
    if (lowerType === 'medinan') return 'مدنية';
    return type;
  };

  const currentFirstSurahNumber = pageData?.ayahs[0]?.surah;
  const currentSurahInfo = surahsList.find(s => s.number === currentFirstSurahNumber);

  // مزامنة حقل إدخال الصفحة مع حالة currentPage
  useEffect(() => {
    setPageInput(currentPage.toString());
  }, [currentPage]);

  // تحميل بيانات الصفحة من API
  const loadPageData = async (page: number) => {
    setPageLoading(true);
    console.log(`Loading page ${page}...`);

    try {
      // استخدام API الموثوق alquran.cloud أولاً
      console.log('Trying primary API...');
      const response = await fetch(`https://api.alquran.cloud/v1/page/${page}/quran-uthmani`);

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const data = await response.json();
      console.log('Primary API data received:', data);

      if (data.code === 200 && data.data && data.data.ayahs && data.data.ayahs.length > 0) {
        const ayahs = data.data.ayahs;
        const firstAyah = ayahs[0];

        const processedData: PageData = {
          page: page,
          surah_name: firstAyah.surah?.name || `سورة ${firstAyah.surah?.number || 1}`,
          juz: firstAyah.juz || Math.ceil(page / 20),
          ayahs: ayahs.map((ayah: any) => ({
            text: ayah.text || 'نص غير متوفر',
            surah: ayah.surah?.number || 1,
            ayah: ayah.numberInSurah || 1,
            key: `${ayah.surah?.number || 1}:${ayah.numberInSurah || 1}`
          }))
        };

        console.log('Primary processed data:', processedData);
        setPageData(processedData);
        return;
      } else {
        throw new Error('البيانات غير صحيحة من API الأساسي');
      }
    } catch (error) {
      console.error('Primary API failed:', error);

      // محاولة API بديل - QuranCDN
      try {
        console.log('Trying secondary API...');
        const altResponse = await fetch(`https://api.qurancdn.com/api/qdc/verses/by_page/${page}`);

        if (altResponse.ok) {
          const altData = await altResponse.json();
          console.log('Secondary API data:', altData);

          if (altData.verses && altData.verses.length > 0) {
            const verses = altData.verses;
            const firstVerse = verses[0];

            const processedData: PageData = {
              page: page,
              surah_name: `سورة ${firstVerse.chapter_id || 1}`,
              juz: firstVerse.juz_number || Math.ceil(page / 20),
              ayahs: verses.map((verse: any) => ({
                text: verse.text_uthmani || verse.text_indopak || verse.text_simple || 'نص غير متوفر',
                surah: verse.chapter_id || 1,
                ayah: verse.verse_number || 1,
                key: verse.verse_key || `${verse.chapter_id}:${verse.verse_number}`
              }))
            };

            console.log('Secondary processed data:', processedData);
            setPageData(processedData);
            return;
          }
        }
      } catch (altError) {
        console.error('Secondary API also failed:', altError);
      }

      // استخدام بيانات تجريبية واضحة ومفصلة
      console.log('Using fallback data for page:', page);
      const fallbackData: PageData = getPageFallbackData(page);

      setPageData(fallbackData);
      toast.error('تعذر تحميل بيانات الصفحة، سيتم استخدام بيانات تجريبية');
    } finally {
      setPageLoading(false);
    }
  };

  // دالة للحصول على بيانات تجريبية حسب رقم الصفحة
  const getPageFallbackData = (page: number): PageData => {
    const ayahsData: { [key: number]: { surah_name: string; ayahs: Array<{ text: string; surah: number; ayah: number; key: string }> } } = {
      1: {
        surah_name: 'الفاتحة',
        ayahs: [
          { text: 'بِسْمِ اللَّهِ الرَّحْمَٰنِ الرَّحِيمِ', surah: 1, ayah: 1, key: '1:1' },
          { text: 'الْحَمْدُ لِلَّهِ رَبِّ الْعَالَمِينَ', surah: 1, ayah: 2, key: '1:2' },
          { text: 'الرَّحْمَٰنِ الرَّحِيمِ', surah: 1, ayah: 3, key: '1:3' },
          { text: 'مَالِكِ يَوْمِ الدِّينِ', surah: 1, ayah: 4, key: '1:4' },
          { text: 'إِيَّاكَ نَعْبُدُ وَإِيَّاكَ نَسْتَعِينُ', surah: 1, ayah: 5, key: '1:5' },
          { text: 'اهْدِنَا الصِّرَاطَ الْمُسْتَقِيمَ', surah: 1, ayah: 6, key: '1:6' },
          { text: 'صِرَاطَ الَّذِينَ أَنْعَمْتَ عَلَيْهِمْ غَيْرِ الْمَغْضُوبِ عَلَيْهِمْ وَلَا الضَّالِّينَ', surah: 1, ayah: 7, key: '1:7' }
        ]
      },
      2: {
        surah_name: 'البقرة',
        ayahs: [
          { text: 'الم', surah: 2, ayah: 1, key: '2:1' },
          { text: 'ذَٰلِكَ الْكِتَابُ لَا رَيْبَ ۛ فِيهِ ۛ هُدًى لِّلْمُتَّقِينَ', surah: 2, ayah: 2, key: '2:2' },
          { text: 'الَّذِينَ يُؤْمِنُونَ بِالْغَيْبِ وَيُقِيمُونَ الصَّلَاةَ وَمِمَّا رَزَقْنَاهُمْ يُنفِقُونَ', surah: 2, ayah: 3, key: '2:3' },
          { text: 'وَالَّذِينَ يُؤْمِنُونَ بِمَا أُنزِلَ إِلَيْكَ وَمَا أُنزِلَ مِن قَبْلِكَ وَبِالْآخِرَةِ هُمْ يُوقِنُونَ', surah: 2, ayah: 4, key: '2:4' },
          { text: 'أُولَٰئِكَ عَلَىٰ هُدًى مِّن رَّبِّهِمْ ۖ وَأُولَٰئِكَ هُمُ الْمُفْلِحُونَ', surah: 2, ayah: 5, key: '2:5' }
        ]
      }
    };

    const pageData = ayahsData[page] || ayahsData[1];
    return {
      page: page,
      surah_name: pageData.surah_name,
      juz: Math.ceil(page / 20),
      ayahs: pageData.ayahs
    };
  };

  // تحميل الصفحة عند التغيير
  useEffect(() => {
    loadPageData(currentPage);

    // رسالة ترحيبية بالتحديثات الجديدة
    const hasSeenUpdate = localStorage.getItem('mushaf_update_seen');
    const hasSeenRecitersFix = localStorage.getItem('reciters_audio_fix_seen');

    if (!hasSeenUpdate) {
      setTimeout(() => {
        // toast success removed per user request
        localStorage.setItem('mushaf_update_seen', 'true');
      }, 2000);
    } else if (!hasSeenRecitersFix) {
      setTimeout(() => {
        // toast success removed per user request
        localStorage.setItem('reciters_audio_fix_seen', 'true');
      }, 2500);
    }
  }, [currentPage]);

  // تحميل القراء عند بداية التشغيل
  useEffect(() => {
    const loadReciters = () => {
      // استخدام قائمة القراء الموحدة فقط لتجنب التضارب
      const sortedReciters = [...famousReciters].sort((a, b) =>
        a.arabic_name.localeCompare(b.arabic_name, 'ar')
      );

      setReciters(sortedReciters);
      setSelectedReciter(sortedReciters[0] || null);
    };

    loadReciters();
  }, []);

  // إنشاء عنصر الصوت للسور
  useEffect(() => {
    const surahAudio = new Audio();
    surahAudio.preload = 'none';

    surahAudio.addEventListener('ended', () => {
      setIsSurahPlaying(false);
      setCurrentSurah(null);
      setSurahAudioLoading(false);
    });

    surahAudio.addEventListener('play', () => {
      setIsSurahPlaying(true);
      setSurahAudioLoading(false);
    });

    surahAudio.addEventListener('pause', () => {
      setIsSurahPlaying(false);
      setSurahAudioLoading(false);
    });

    setSurahAudioRef(surahAudio);

    return () => {
      surahAudio.pause();
      surahAudio.src = '';
    };
  }, []);

  // إنشاء عنصر الصوت
  useEffect(() => {
    if (!audioRef.current) {
      audioRef.current = new Audio();
      audioRef.current.preload = 'none';
      audioRef.current.crossOrigin = 'anonymous';

      audioRef.current.addEventListener('ended', () => {
        console.log('Audio playback ended');
        setIsAudioLoading(false);
      });

      audioRef.current.addEventListener('play', () => {
        console.log('Audio started playing');
        setIsAudioLoading(false);
      });

      audioRef.current.addEventListener('pause', () => {
        console.log('⏸️ Audio paused');
        setIsAudioLoading(false);
      });

      // إزالة event listener للخطأ العام لتجنب رسائل الخطأ المزعجة
      // سيتم التعامل مع الأخطاء داخل دالة playAyahAudio
    }

    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current.src = '';
        audioRef.current = null;
      }
    };
  }, []);

  // التعامل مع النقر على الآية
  const handleAyahClick = async (surah: number, ayah: number) => {
    console.log(`Clicked ayah: ${surah}:${ayah}`);

    // إغلاق التفسير إذا كانت نفس الآية
    if (selectedAyah && selectedAyah.surah === surah && selectedAyah.ayah === ayah) {
      setSelectedAyah(null);
      setTafseer(null);
      if (audioRef.current) {
        audioRef.current.pause();
        setIsAudioLoading(false);
      }
      return;
    }

    setSelectedAyah({ surah, ayah });

    // تحميل التفسير
    setTafseerLoading(true);
    try {
      const tafseerData = await fetchTafseer(surah, ayah);
      setTafseer(tafseerData);
    } catch (error) {
      console.error('Error fetching tafseer:', error);
      toast.error('تعذر تحميل التفسير');
    } finally {
      setTafseerLoading(false);
    }
  };

  // دالة تشغيل صوت الآية
  const playAyahAudio = async (surah: number, ayah: number) => {
    if (!audioRef.current) return;

    console.log(`Attempting to play audio for ${surah}:${ayah}`);
    setIsAudioLoading(true);

    // إيقاف أي صوت سابق
    audioRef.current.pause();
    audioRef.current.currentTime = 0;

    // تجربة عدة مصادر صوتية للآيات الفردية (العفاسي والحصري كافتراضي)
    const formattedSurah = surah.toString().padStart(3, '0');
    const formattedAyah = ayah.toString().padStart(3, '0');

    const audioSources = [
      // العفاسي - أولوية عالية
      `https://cdn.islamic.network/quran/audio/128/ar.alafasy/${surah}/${ayah}.mp3`,
      `https://audio.qurancdn.com/Alafasy_128kbps/${formattedSurah}${formattedAyah}.mp3`,
      `https://everyayah.com/data/Alafasy_128kbps/${formattedSurah}${formattedAyah}.mp3`,

      // الحصري - أولوية متوسطة
      `https://cdn.islamic.network/quran/audio/128/ar.husary/${surah}/${ayah}.mp3`,
      `https://audio.qurancdn.com/Husary_128kbps/${formattedSurah}${formattedAyah}.mp3`,
      `https://everyayah.com/data/Husary_64kbps/${formattedSurah}${formattedAyah}.mp3`,

      // عبد الباسط - أولوية متوسطة
      `https://audio.qurancdn.com/Abdul_Basit_Murattal_192kbps/${formattedSurah}${formattedAyah}.mp3`,
      `https://cdn.islamic.network/quran/audio/128/ar.abdulbasitmurattal/${surah}/${ayah}.mp3`,

      // المنشاوي - أولوية متوسطة
      `https://audio.qurancdn.com/Minshawi_Murattal_128kbps/${formattedSurah}${formattedAyah}.mp3`,
      `https://everyayah.com/data/Minshawi_Murattal_128kbps/${formattedSurah}${formattedAyah}.mp3`
    ];

    for (let i = 0; i < audioSources.length; i++) {
      const audioUrl = audioSources[i];
      console.log(`Trying audio source ${i + 1}/${audioSources.length}: ${audioUrl}`);

      try {
        audioRef.current.src = audioUrl;
        audioRef.current.load();

        // انتظار تحميل الصوت
        const loadPromise = new Promise<void>((resolve, reject) => {
          const timeout = setTimeout(() => {
            reject(new Error('Timeout'));
          }, 5000);

          const onCanPlay = () => {
            clearTimeout(timeout);
            audioRef.current?.removeEventListener('canplay', onCanPlay);
            audioRef.current?.removeEventListener('error', onError);
            resolve();
          };

          const onError = (e: Event) => {
            clearTimeout(timeout);
            audioRef.current?.removeEventListener('canplay', onCanPlay);
            audioRef.current?.removeEventListener('error', onError);
            reject(new Error('Load error'));
          };

          audioRef.current?.addEventListener('canplay', onCanPlay);
          audioRef.current?.addEventListener('error', onError);
        });

        await loadPromise;

        // تشغيل الصوت
        const playPromise = audioRef.current.play();
        if (playPromise !== undefined) {
          await playPromise;
        }

        console.log(`✅ Successfully playing: ${audioUrl}`);
        setIsAudioLoading(false);

        // تحديد اسم القارئ بناءً على الرابط
        let reciterName = 'القارئ';
        if (audioUrl.includes('alafasy')) {
          reciterName = 'الشيخ مشاري العفاسي';
        } else if (audioUrl.includes('husary')) {
          reciterName = 'الشيخ محمود الحصري';
        }

        toast.success(`يتم تشغيل الآية بصوت ${reciterName}`, {
          duration: 3000,
          position: 'top-center'
        });
        return; // نجح التشغيل، اخرج من الحلقة

      } catch (error) {
        console.log(`❌ Failed to play: ${audioUrl}`, error);

        // إذا كان هذا آخر مصدر، أظهر رسالة خطأ
        if (i === audioSources.length - 1) {
          console.error('❌ جميع مصادر الصوت فشلت');
          setIsAudioLoading(false);
          toast.error('❌ تعذر تشغيل صوت الآية. تحقق من اتصال الإنترنت', {
            duration: 4000,
            position: 'top-center'
          });
        }
        continue;
      }
    }
  };

  // إيقاف الصوت
  const stopAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      audioRef.current.currentTime = 0;
      setIsAudioLoading(false);
    }
  };

  // الحصول على روابط صوت السورة (الرئيسية والاحتياطية)
  const getSurahAudioUrls = (surahNumber: number, reciter: Reciter) => {
    // استخدام الدالة المستوردة للحصول على الرابط الأساسي والاحتياطية
    const primaryUrl = getAudioUrl(reciter.id, surahNumber);
    const fallbackUrls = getFallbackAudioUrls(reciter.id, surahNumber);
    return [primaryUrl, ...fallbackUrls];
  };

  // تشغيل/إيقاف السورة كاملة
  const toggleSurahAudio = async (surahNumber: number) => {
    if (!surahAudioRef || !selectedReciter) return;

    // إذا كانت نفس السورة تعمل، أوقفها
    if (currentSurah === surahNumber && isSurahPlaying) {
      surahAudioRef.pause();
      setIsSurahPlaying(false);
      return;
    }

    // إذا كانت مؤقفة، شغلها
    if (currentSurah === surahNumber && !isSurahPlaying) {
      try {
        await surahAudioRef.play();
        setIsSurahPlaying(true);
        // show browser notification on start
        showSurahNotification(
          `بدء تشغيل ${getSurahName(surahNumber)}`,
          { body: selectedReciter.arabic_name, tag: `surah-start-${surahNumber}` }
        );
        toast.success(`يتم تشغيل ${getSurahName(surahNumber)} بصوت ${selectedReciter.arabic_name}`, {
          duration: 4000,
          position: 'top-center'
        });
        return;
      } catch (error) {
        console.error('Error resuming surah audio:', error);
      }
      return;
    }

    // سورة جديدة - ابدأ التشغيل
    setSurahAudioLoading(true);
    const audioUrls = getSurahAudioUrls(surahNumber, selectedReciter);

    for (const audioUrl of audioUrls) {
      try {
        console.log(`Trying surah audio URL: ${audioUrl}`);
        surahAudioRef.src = audioUrl;
        surahAudioRef.load();

        await new Promise((resolve, reject) => {
          const timeout = setTimeout(() => reject(new Error('Timeout')), 8000);

          const onCanPlay = () => {
            clearTimeout(timeout);
            surahAudioRef.removeEventListener('canplay', onCanPlay);
            surahAudioRef.removeEventListener('error', onError);
            resolve(true);
          };

          const onError = () => {
            clearTimeout(timeout);
            surahAudioRef.removeEventListener('canplay', onCanPlay);
            surahAudioRef.removeEventListener('error', onError);
            reject(new Error('Audio load failed'));
          };

          surahAudioRef.addEventListener('canplay', onCanPlay);
          surahAudioRef.addEventListener('error', onError);
        });

        await surahAudioRef.play();
        setCurrentSurah(surahNumber);
        setIsSurahPlaying(true);
        setSurahAudioLoading(false);

        // الحصول على اسم السورة
        const surahName = getSurahName(surahNumber);
        toast.success(`يتم تشغيل ${surahName} بصوت ${selectedReciter.arabic_name}`, {
          duration: 4000,
          position: 'top-center'
        });
        return;

      } catch (error) {
        console.log(`Failed to load surah audio from: ${audioUrl}`, error);
        continue;
      }
    }

    // فشل تحميل جميع الروابط
    setSurahAudioLoading(false);
    toast.error('❌ تعذر تشغيل السورة. جرب قارئ آخر', {
      duration: 4000,
      position: 'top-center'
    });
  };

  // الحصول على اسم السورة من رقمها
  const getSurahName = (surahNumber: number) => {
    const surahNames: { [key: number]: string } = {
      1: 'الفاتحة', 2: 'البقرة', 3: 'آل عمران', 4: 'النساء', 5: 'المائدة',
      6: 'الأنعام', 7: 'الأعراف', 8: 'الأنفال', 9: 'التوبة', 10: 'يونس',
      11: 'هود', 12: 'يوسف', 13: 'الرعد', 14: 'إبراهيم', 15: 'الحجر',
      16: 'النحل', 17: 'الإسراء', 18: 'الكهف', 19: 'مريم', 20: 'طه',
      21: 'الأنبياء', 22: 'الحج', 23: 'المؤمنون', 24: 'النور', 25: 'الفرقان',
      26: 'الشعراء', 27: 'النمل', 28: 'القصص', 29: 'العنكبوت', 30: 'الروم',
      31: 'لقمان', 32: 'السجدة', 33: 'الأحزاب', 34: 'سبأ', 35: 'فاطر',
      36: 'يس', 37: 'الصافات', 38: 'ص', 39: 'الزمر', 40: 'غافر',
      41: 'فصلت', 42: 'الشورى', 43: 'الزخرف', 44: 'الدخان', 45: 'الجاثية',
      46: 'الأحقاف', 47: 'محمد', 48: 'الفتح', 49: 'الحجرات', 50: 'ق',
      51: 'الذاريات', 52: 'الطور', 53: 'النجم', 54: 'القمر', 55: 'الرحمن',
      56: 'الواقعة', 57: 'الحديد', 58: 'المجادلة', 59: 'الحشر', 60: 'الممتحنة',
      61: 'الصف', 62: 'الجمعة', 63: 'المنافقون', 64: 'التغابن', 65: 'الطلاق',
      66: 'التحريم', 67: 'الملك', 68: 'القلم', 69: 'الحاقة', 70: 'المعارج',
      71: 'نوح', 72: 'الجن', 73: 'المزمل', 74: 'المدثر', 75: 'القيامة',
      76: 'الإنسان', 77: 'المرسلات', 78: 'النبأ', 79: 'النازعات', 80: 'عبس',
      81: 'التكوير', 82: 'الانفطار', 83: 'المطففين', 84: 'الانشقاق', 85: 'البروج',
      86: 'الطارق', 87: 'الأعلى', 88: 'الغاشية', 89: 'الفجر', 90: 'البلد',
      91: 'الشمس', 92: 'الليل', 93: 'الضحى', 94: 'الشرح', 95: 'التين',
      96: 'العلق', 97: 'القدر', 98: 'البينة', 99: 'الزلزلة', 100: 'العاديات',
      101: 'القارعة', 102: 'التكاثر', 103: 'العصر', 104: 'الهمزة', 105: 'الفيل',
      106: 'قريش', 107: 'الماعون', 108: 'الكوثر', 109: 'الكافرون', 110: 'النصر',
      111: 'المسد', 112: 'الإخلاص', 113: 'الفلق', 114: 'الناس'
    };
    return surahNames[surahNumber] || `سورة ${surahNumber}`;
  };

  // إيقاف السورة
  const stopSurahAudio = () => {
    if (surahAudioRef) {
      surahAudioRef.pause();
      surahAudioRef.currentTime = 0;
      setIsSurahPlaying(false);
      setCurrentSurah(null);
      setSurahAudioLoading(false);
    }
  };

  // إغلاق نافذة التفسير
  const closeTafseer = () => {
    setSelectedAyah(null);
    setTafseer(null);
    stopAudio();
  };

  // الانتقال بين الصفحات مع تحسينات
  const goToPage = (page: number) => {
    if (page >= 1 && page <= 604) {
      setCurrentPage(page);
      setSelectedAyah(null);
      setTafseer(null);
      stopAudio();
      // إغلاق قائمة القراء عند التنقل
      setShowReciterSelector(false);

      // إضافة تحديث في التاريخ للتنقل السريع
      window.history.replaceState(null, '', `?page=${page}`);

      toast.success(`انتقلت إلى الصفحة ${page}`, {
        duration: 1500,
        position: 'bottom-center',
      });
    }
  };

  // تحميل الصفحة من URL عند التحميل الأول
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const pageParam = urlParams.get('page');
    if (pageParam) {
      const pageNumber = parseInt(pageParam);
      if (pageNumber >= 1 && pageNumber <= 604) {
        setCurrentPage(pageNumber);
      }
    }
  }, []);

  // تحميل قائمة السور للفهرس الصغير
  useEffect(() => {
    const loadSurahsList = async () => {
      try {
        const list = await fetchSurahs();
        setSurahsList(list);
      } catch (error) {
        console.error('Error fetching surahs for index:', error);
      }
    };
    loadSurahsList();
  }, []);

  // دالة للانتقال للجزء المحدد
  const goToJuz = (juzNumber: number) => {
    // صفحات بداية الأجزاء
    const juzPages = {
      1: 1, 2: 22, 3: 42, 4: 62, 5: 82, 6: 102, 7: 122, 8: 142, 9: 162, 10: 182,
      11: 202, 12: 222, 13: 242, 14: 262, 15: 282, 16: 302, 17: 322, 18: 342, 19: 362, 20: 382,
      21: 402, 22: 422, 23: 442, 24: 462, 25: 482, 26: 502, 27: 522, 28: 542, 29: 562, 30: 582
    };

    const page = juzPages[juzNumber as keyof typeof juzPages];
    if (page) {
      goToPage(page);
    }
  };

  // دالة للانتقال لسورة محددة مع دعم ديناميكي لكافة السور
  const goToSurah = async (surahNumber: number) => {
    // صفحات بداية السور المعروفة
    const surahPages: { [key: number]: number } = {
      1: 1,    // الفاتحة
      2: 2,    // البقرة
      3: 50,   // آل عمران
      4: 77,   // النساء
      5: 106,  // المائدة
      6: 128,  // الأنعام
      7: 151,  // الأعراف
      8: 177,  // الأنفال
      9: 187,  // التوبة
      10: 208, // يونس
      11: 221, // هود
      12: 235, // يوسف
      13: 249, // الرعد
      14: 255, // إبراهيم
      15: 262, // الحجر
      16: 267, // النحل
      17: 282, // الإسراء
      18: 293, // الكهف
      19: 305, // مريم
      20: 312, // طه
      21: 322, // الأنبياء
      22: 332, // الحج
      23: 342, // المؤمنون
      24: 350, // النور
      25: 359, // الفرقان
      26: 367, // الشعراء
      27: 377, // النمل
      28: 385, // القصص
      29: 396, // العنكبوت
      30: 404, // الروم
      36: 440, // يس
      55: 531, // الرحمن
      67: 562, // الملك
      78: 582, // النبأ
      112: 604 // الإخلاص
    };
    let targetPage = surahPages[surahNumber];
    // إذا لم توجد خريطة ثابتة، جلب أول آية لتحديد الصفحة ديناميكياً
    if (!targetPage) {
      try {
        toast.loading(`جاري تحديد موقع سورة ${surahNumber}...`, { id: 'goToSurah' });
        const ayahData = await fetchAyah(surahNumber, 1);
        targetPage = ayahData.page;
        toast.success(`تم تحديد موقع السورة في الصفحة ${targetPage}`, { id: 'goToSurah' });
      } catch (error) {
        console.error(`خطأ في تحديد صفحة السورة ${surahNumber}:`, error);
        toast.error('عذراً، الانتقال المباشر لهذه السورة غير متوفر', { id: 'goToSurah' });
        return;
      }
    }
    goToPage(targetPage);
  };

  // إغلاق قائمة القراء عند النقر خارجها أو الضغط على Escape + اختصارات التنقل
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      // تحقق من أن النقر ليس داخل مكون القائمة
      const target = event.target as Element;
      if (showReciterSelector && target && !target.closest('[data-reciter-selector]')) {
        setShowReciterSelector(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      // إذا كان المستخدم يكتب في حقل إدخال، لا تطبق الاختصارات
      if (event.target instanceof HTMLInputElement || event.target instanceof HTMLTextAreaElement) {
        if (event.key === 'Escape' && showReciterSelector) {
          setShowReciterSelector(false);
        }
        return;
      }

      switch (event.key) {
        case 'Escape':
          if (showReciterSelector) {
            setShowReciterSelector(false);
          } else if (selectedAyah) {
            closeTafseer();
          }
          break;
        case 'ArrowRight':
          // السهم الأيمن للصفحة السابقة (العربية من اليمين لليسار)
          event.preventDefault();
          if (currentPage > 1) {
            goToPage(currentPage - 1);
          }
          break;
        case 'ArrowLeft':
          // السهم الأيسر للصفحة التالية
          event.preventDefault();
          if (currentPage < 604) {
            goToPage(currentPage + 1);
          }
          break;
        case 'Home':
          // العودة للصفحة الأولى
          event.preventDefault();
          goToPage(1);
          break;
        case 'End':
          // الذهاب للصفحة الأخيرة
          event.preventDefault();
          goToPage(604);
          break;
        case '1':
          // الانتقال سريع للفاتحة
          event.preventDefault();
          goToSurah(1);
          break;
        case '2':
          // الانتقال سريع للبقرة
          event.preventDefault();
          goToSurah(2);
          break;
        case '3':
          // الانتقال سريع لآل عمران
          event.preventDefault();
          goToSurah(3);
          break;
        case ' ':
          // مسافة لإيقاف/تشغيل الصوت
          event.preventDefault();
          if (currentSurah && isSurahPlaying) {
            stopSurahAudio();
          }
          break;
      }
    };

    document.addEventListener('click', handleClickOutside, true);
    document.addEventListener('keydown', handleKeyDown);

    return () => {
      document.removeEventListener('click', handleClickOutside, true);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [showReciterSelector, currentPage, selectedAyah, currentSurah, isSurahPlaying]);

  // تحديد إذا كانت الآية محددة
  const isAyahSelected = (surah: number, ayah: number) => {
    return selectedAyah && selectedAyah.surah === surah && selectedAyah.ayah === ayah;
  };

  // تشغيل الصوت مع نظام الروابط الاحتياطية المحسن
  const playAudio = async (surahNumber: number) => {
    if (!selectedReciter || !audioRef.current) return;

    try {
      setIsLoading(true);
      setError(null);

      console.log(`🎵 محاولة تشغيل السورة ${surahNumber} بصوت ${selectedReciter.arabic_name}`);

      // استخدام النظام الجديد للحصول على أفضل رابط صوتي
      const audioUrl = await getValidAudioUrl(selectedReciter.id, surahNumber);

      if (!audioUrl) {
        throw new Error('لم يتم العثور على رابط صوتي صالح');
      }

      console.log(`✅ تم العثور على رابط صوتي: ${audioUrl}`);

      // تطبيق الصوت
      audioRef.current.src = audioUrl;
      audioRef.current.load();

      // انتظار تحميل الصوت
      await new Promise<void>((resolve, reject) => {
        const timeout = setTimeout(() => {
          reject(new Error('انتهت مهلة تحميل الصوت'));
        }, 10000);

        const onCanPlay = () => {
          cleanup();
          resolve();
        };

        const onError = () => {
          cleanup();
          reject(new Error('فشل في تحميل الصوت'));
        };

        const cleanup = () => {
          clearTimeout(timeout);
          audioRef.current?.removeEventListener('canplay', onCanPlay);
          audioRef.current?.removeEventListener('error', onError);
        };

        audioRef.current?.addEventListener('canplay', onCanPlay);
        audioRef.current?.addEventListener('error', onError);
      });

      // تشغيل الصوت
      await audioRef.current.play();

      setCurrentSurah(surahNumber);
      setIsSurahPlaying(true);

      // إشعار النجاح
      toast.success(`▶ بدأ تشغيل السورة ${surahNumber}`, {
        duration: 2000,
        position: 'top-center',
      });

    } catch (error) {
      console.error('خطأ في تشغيل الصوت:', error);

      // محاولة استخدام الرابط الاحتياطي العام (الحصري)
      try {
        const fallbackUrl = `https://server13.mp3quran.net/husr/${surahNumber.toString().padStart(3, '0')}.mp3`;

        if (audioRef.current) {
          console.log(`🔄 تجربة الرابط الاحتياطي: ${fallbackUrl}`);

          audioRef.current.src = fallbackUrl;
          audioRef.current.load();

          await new Promise<void>((resolve, reject) => {
            const timeout = setTimeout(() => {
              reject(new Error('انتهت مهلة الرابط الاحتياطي'));
            }, 8000);

            const onCanPlay = () => {
              cleanup();
              resolve();
            };

            const onError = () => {
              cleanup();
              reject(new Error('فشل الرابط الاحتياطي'));
            };

            const cleanup = () => {
              clearTimeout(timeout);
              audioRef.current?.removeEventListener('canplay', onCanPlay);
              audioRef.current?.removeEventListener('error', onError);
            };

            audioRef.current?.addEventListener('canplay', onCanPlay);
            audioRef.current?.addEventListener('error', onError);
          });

          await audioRef.current.play();

          setCurrentSurah(surahNumber);
          setIsSurahPlaying(true);

          // تحديث القارئ إلى الحصري
          const husaryReciter = getReciterById('husary');
          if (husaryReciter) {
            setSelectedReciter(husaryReciter);
          }

          toast(`⚠️ تم التبديل للحصري - السورة ${surahNumber}`, {
            duration: 3000,
            position: 'top-center',
            icon: '🔄',
            style: {
              background: '#f59e0b',
              color: '#fff',
            },
          });
        }
      } catch (fallbackError) {
        console.error('فشل في جميع الروابط:', fallbackError);
        setError('فشل في تحميل الملف الصوتي. يرجى المحاولة مرة أخرى.');
        setIsSurahPlaying(false);
        setCurrentSurah(null);

        toast.error('فشل في تشغيل الصوت. يرجى المحاولة لاحقاً', {
          duration: 4000,
          position: 'top-center',
        });
      }
    } finally {
      setIsLoading(false);
    }
  };

  // دالة للتحكم في التشغيل والإيقاف للسور
  const toggleSurahPlayPause = async (surahNumber: number) => {
    if (!selectedReciter) return;

    // إذا كانت السورة الحالية تعمل، أوقفها
    if (currentSurah === surahNumber && isSurahPlaying) {
      if (audioRef.current) {
        audioRef.current.pause();
        setIsSurahPlaying(false);
        toast.success(`تم إيقاف السورة ${surahNumber}`, {
          duration: 2000,
          position: 'top-center',
        });
      }
    }
    // إذا كانت السورة الحالية متوقفة، شغلها
    else if (currentSurah === surahNumber && !isSurahPlaying) {
      if (audioRef.current) {
        try {
          await audioRef.current.play();
          setIsSurahPlaying(true);
          toast.success(`تم استئناف السورة ${surahNumber}`, {
            duration: 2000,
            position: 'top-center',
          });
        } catch (error) {
          console.error('خطأ في استئناف التشغيل:', error);
          // إذا فشل الاستئناف، شغل من جديد
          await playAudio(surahNumber);
        }
      }
    }
    // إذا كانت سورة مختلفة، شغل السورة الجديدة
    else {
      await playAudio(surahNumber);
    }
  };

  if (loading || pageLoading) {
    return (
      <div className="real-mushaf-container">
        <div className="real-mushaf-page loading">
          <div className="mushaf-header">
            <div className="h-6 bg-amber-200 dark:bg-amber-700 rounded w-24 animate-pulse"></div>
            <div className="h-6 bg-amber-200 dark:bg-amber-700 rounded w-32 animate-pulse"></div>
          </div>
          <div className="mushaf-content">
            {[...Array(15)].map((_, index) => (
              <div key={index} className="h-8 bg-amber-100 dark:bg-amber-800 rounded mb-4 animate-pulse"></div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="real-mushaf-container">
      {/* مشغل السور الكاملة */}
      <div style={{
        background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))',
        border: '2px solid rgba(16, 185, 129, 0.3)',
        borderRadius: '16px',
        padding: '20px',
        marginBottom: '24px',
        boxShadow: '0 4px 12px rgba(16, 185, 129, 0.1)'
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          flexWrap: 'wrap',
          gap: '16px'
        }}>
          {/* معلومات التشغيل */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #10b981, #059669)',
              color: 'white',
              borderRadius: '50%',
              width: '48px',
              height: '48px',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              fontSize: '20px',
              fontWeight: 'bold',
              boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
            }}>
              ▶
            </div>
            <div>
              <h3 style={{
                margin: '0 0 4px 0',
                fontSize: '18px',
                fontWeight: 'bold',
                color: '#047857'
              }}>
                تشغيل السورة كاملة
              </h3>
              <p style={{
                margin: 0,
                fontSize: '14px',
                color: '#059669'
              }}>
                {currentSurah ? `يتم تشغيل ${getSurahName(currentSurah)}` : 'اختر سورة للاستماع إليها كاملة'}
              </p>
            </div>
          </div>

          {/* أزرار التحكم */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
            {/* اختيار القارئ */}
            <div
              data-reciter-selector
              style={{ position: 'relative' }}
              onClick={(e) => e.stopPropagation()} // منع إغلاق القائمة عند النقر داخلها
            >
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setShowReciterSelector(!showReciterSelector);
                }}
                disabled={reciters.length === 0}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: 'white',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  color: '#047857',
                  cursor: reciters.length === 0 ? 'not-allowed' : 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease',
                  minWidth: '180px',
                  justifyContent: 'space-between',
                  opacity: reciters.length === 0 ? 0.5 : 1
                }}
              >
                {reciters.length === 0 ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>جاري التحميل...</span>
                  </>
                ) : (
                  <>
                    <span>{selectedReciter?.arabic_name || 'اختر القارئ'}</span>
                    <span style={{
                      transform: showReciterSelector ? 'rotate(180deg)' : 'rotate(0deg)',
                      transition: 'transform 0.3s ease'
                    }}>
                      ▼
                    </span>
                  </>
                )}
              </button>

              {showReciterSelector && (
                <div style={{
                  position: 'absolute',
                  top: '100%',
                  left: 0,
                  right: 0,
                  background: 'white',
                  border: '2px solid #10b981',
                  borderRadius: '8px',
                  boxShadow: '0 8px 24px rgba(0, 0, 0, 0.15)',
                  zIndex: 50,
                  maxHeight: '250px',
                  overflowY: 'auto',
                  marginTop: '4px',
                  minWidth: '300px'
                }}>
                  {reciters.map(reciter => (
                    <button
                      key={reciter.id}
                      onClick={(e) => {
                        e.stopPropagation();
                        setSelectedReciter(reciter);
                        setShowReciterSelector(false);
                        // إيقاف أي صوت حالي عند تغيير القارئ
                        if (currentSurah) {
                          stopSurahAudio();
                        }
                        toast.success(`تم اختيار ${reciter.arabic_name}`, {
                          duration: 2000,
                          position: 'top-center'
                        });
                      }}
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        textAlign: 'right',
                        border: 'none',
                        background: selectedReciter?.id === reciter.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent',
                        color: '#047857',
                        cursor: 'pointer',
                        fontSize: '14px',
                        borderBottom: '1px solid rgba(16, 185, 129, 0.1)',
                        transition: 'background-color 0.2s ease'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.background = 'rgba(16, 185, 129, 0.1)';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.background = selectedReciter?.id === reciter.id ? 'rgba(16, 185, 129, 0.15)' : 'transparent';
                      }}
                    >
                      <div style={{ fontWeight: selectedReciter?.id === reciter.id ? 'bold' : 'normal' }}>
                        {reciter.arabic_name}
                        {selectedReciter?.id === reciter.id && (
                          <span style={{ color: '#10b981', marginRight: '8px' }}>✓</span>
                        )}
                      </div>
                      {reciter.description && (
                        <div style={{
                          fontSize: '12px',
                          color: '#6b7280',
                          marginTop: '4px',
                          fontWeight: 'normal'
                        }}>
                          {reciter.description}
                        </div>
                      )}
                    </button>
                  ))}
                </div>
              )}
            </div>

            {/* أزرار التشغيل للسور الحالية */}
            {pageData?.ayahs && pageData.ayahs.length > 0 && (
              <button
                onClick={() => {
                  const firstAyah = pageData.ayahs[0];
                  toggleSurahAudio(firstAyah.surah);
                }}
                disabled={surahAudioLoading || !selectedReciter}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '12px 20px',
                  background: currentSurah === pageData.ayahs[0]?.surah && isSurahPlaying ? '#ef4444' : '#10b981',
                  color: 'white',
                  border: 'none',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '16px',
                  fontWeight: '600',
                  transition: 'all 0.3s ease',
                  boxShadow: '0 4px 12px rgba(16, 185, 129, 0.3)'
                }}
              >
                {surahAudioLoading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : currentSurah === pageData.ayahs[0]?.surah && isSurahPlaying ? (
                  <Pause className="w-5 h-5" />
                ) : (
                  <Play className="w-5 h-5" />
                )}
                {surahAudioLoading
                  ? 'جاري التحميل...'
                  : currentSurah === pageData.ayahs[0]?.surah && isSurahPlaying
                    ? 'إيقاف السورة'
                    : `تشغيل ${getSurahName(pageData.ayahs[0]?.surah || 1)}`
                }
              </button>
            )}

            {/* زر الإيقاف */}
            {currentSurah && (
              <button
                onClick={stopSurahAudio}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: '8px',
                  padding: '10px 16px',
                  background: '#f3f4f6',
                  border: '2px solid #d1d5db',
                  borderRadius: '8px',
                  color: '#4b5563',
                  cursor: 'pointer',
                  fontSize: '14px',
                  fontWeight: '500',
                  transition: 'all 0.3s ease'
                }}
              >
                <X className="w-4 h-4" />
                إيقاف
              </button>
            )}
          </div>
        </div>
      </div>

      {/* صفحة المصحف الحقيقية */}
      <div className="real-mushaf-page">
        {/* رأس الصفحة */}
        <div className="mushaf-header">
          <div className="surah-name">
            {currentSurahInfo?.name || pageData?.surah_name || ''}
          </div>
          <div className="juz-number">
            الجزء {pageData?.juz || ''}{currentSurahInfo ? ` - ${getRevelationTypeArabic(currentSurahInfo.revelationType)}` : ''}
          </div>
        </div>

        {/* محتوى الصفحة */}
        <div className="mushaf-content">
          {pageData?.ayahs && pageData.ayahs.length > 0 ? (
            pageData.ayahs.map((ayah, index) => {
              const prevSurah = index > 0 ? pageData.ayahs[index - 1].surah : null;
              const isNewSurah = index > 0 && ayah.surah !== prevSurah;
              const surahInfo = surahsList.find(s => s.number === ayah.surah);
              return (
                <React.Fragment key={`${ayah.surah}:${ayah.ayah}`}>
                  {isNewSurah && (
                    <div className="surah-separator" style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      margin: '16px 0 12px',
                      direction: 'rtl'
                    }}>
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to left, transparent, #b8860b)' }}></div>
                      <span style={{
                        fontSize: '18px',
                        fontWeight: 'bold',
                        color: '#1a5c3a',
                        fontFamily: "'Amiri', serif",
                        whiteSpace: 'nowrap'
                      }}>
                        ❁ سورة {surahInfo?.name || getSurahName(ayah.surah)} ❁
                      </span>
                      <div style={{ flex: 1, height: '1px', background: 'linear-gradient(to right, transparent, #b8860b)' }}></div>
                    </div>
                  )}
                  <span
                    key={`${ayah.surah}:${ayah.ayah}`}
                    className={`ayah-text ${isAyahSelected(ayah.surah, ayah.ayah) ? 'selected' : ''}`}
                    onClick={() => handleAyahClick(ayah.surah, ayah.ayah)}
                    style={{
                      display: 'inline',
                      fontSize: '24px',
                      lineHeight: '2.8',
                      color: 'inherit',
                      fontFamily: "'Amiri', serif"
                    }}
                  >
                    {ayah.text || 'نص غير متوفر'}
                    <span className="ayah-number" style={{ color: '#10b981', fontWeight: 'bold', margin: '0 5px' }}>
                      ﴿{ayah.ayah}﴾
                    </span>
                    {index < pageData.ayahs.length - 1 && ' '}
                  </span>
                </React.Fragment>
              );
            })
          ) : (
            <div style={{ textAlign: 'center', padding: '40px', color: '#6b7280' }}>
              <p>لا توجد آيات متاحة للعرض</p>
              <p>يتم تحميل البيانات...</p>
            </div>
          )}
        </div>

        {/* رقم الصفحة */}
        <div className="page-number">
          {currentPage}
        </div>
      </div>

      {/* أزرار التنقل المحسنة */}
      <div className="mushaf-navigation">
        {/* التنقل الأساسي */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
          <button onClick={() => goToPage(currentPage - 1)} disabled={currentPage === 1} className="nav-button prev" style={{ /* unchanged styles */ }}>
            <ChevronRight className="w-5 h-5" />
            السابقة
          </button>

          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.1), rgba(5, 150, 105, 0.1))', padding: '16px 20px', borderRadius: '16px', border: '2px solid rgba(16, 185, 129, 0.3)' }}>
            <span style={{ fontSize: '18px', fontWeight: 'bold', color: '#047857' }}>
              صفحة {currentPage} من 604
            </span>
            <input
              type="number"
              min="1"
              max="604"
              value={pageInput}
              onChange={(e) => setPageInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const page = parseInt(pageInput);
                  if (!isNaN(page) && page >= 1 && page <= 604) {
                    goToPage(page);
                  }
                }
              }}
              style={{ width: '80px', padding: '8px 12px', fontSize: '16px', fontWeight: 'bold', border: '2px solid #10b981', borderRadius: '8px', textAlign: 'center', color: '#047857', backgroundColor: 'white' }}
              placeholder="رقم"
            />
          </div>

          <button onClick={() => goToPage(currentPage + 1)} disabled={currentPage === 604} className="nav-button next" style={{ /* unchanged styles */ }}>
            التالية
            <ChevronLeft className="w-5 h-5" />
          </button>
        </div>

        {/* اختيار الجزء */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '16px' }} data-juz-selector>
          <button onClick={() => setShowJuzSelector(!showJuzSelector)} style={{ padding: '8px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            جزء {pageData?.juz || 1}
          </button>
          {showJuzSelector && (
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid #10b981', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', zIndex: 50 }}>
              {Array.from({ length: 30 }, (_, idx) => idx + 1).map(juzNum => (
                <button key={juzNum} onClick={() => { goToJuz(juzNum); setShowJuzSelector(false); }} style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'center', border: 'none', background: pageData?.juz === juzNum ? '#10b981' : 'white', color: pageData?.juz === juzNum ? 'white' : '#047857', cursor: 'pointer' }}>
                  جزء {juzNum}
                </button>
              ))}
            </div>
          )}
        </div>

        {/* التنقل السريع بين السور */}
        <div style={{ position: 'relative', textAlign: 'center', marginBottom: '16px' }} data-surah-selector>
          <button onClick={() => setShowSurahSelector(!showSurahSelector)} style={{ padding: '8px 12px', backgroundColor: '#10b981', color: 'white', border: 'none', borderRadius: '8px', cursor: 'pointer', fontSize: '14px', fontWeight: '600' }}>
            اختر سورة
          </button>
          {showSurahSelector && (
            <div style={{ position: 'absolute', top: '100%', left: '50%', transform: 'translateX(-50%)', background: 'white', border: '1px solid #10b981', borderRadius: '8px', boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)', zIndex: 50, maxHeight: '300px', overflowY: 'auto', minWidth: '200px' }}>
              {surahsList.map(surah => (
                <button
                  key={surah.number}
                  onClick={() => { goToSurah(surah.number); setShowSurahSelector(false); }}
                  style={{ display: 'block', width: '100%', padding: '8px 12px', textAlign: 'center', border: 'none', background: pageData?.ayahs[0]?.surah === surah.number ? '#10b981' : 'white', color: pageData?.ayahs[0]?.surah === surah.number ? 'white' : '#047857', cursor: 'pointer' }}
                >
                  {surah.number}. {surah.name}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* مؤشر الصوت */}
      {selectedAyah && (
        <div className="audio-indicator">
          <div className="flex items-center space-x-2 rtl:space-x-reverse">
            {isAudioLoading ? (
              <Loader2 className="w-5 h-5 text-emerald-600 animate-spin" />
            ) : (
              <Volume2 className="w-5 h-5 text-emerald-600" />
            )}
            <div className="flex flex-col">
              <span className="text-emerald-600 font-medium">
                {isAudioLoading ? 'جاري تحميل الصوت...' : 'آية محددة'}
              </span>
              <span className="text-emerald-500 text-sm">
                انقر للاستماع والتفسير
              </span>
            </div>
          </div>
        </div>
      )}

      {/* نافذة التفسير */}
      {selectedAyah && (
        <div className="tafseer-modal">
          <div className="tafseer-content">
            <div className="tafseer-header">
              <h3 className="tafseer-title">
                تفسير الآية {selectedAyah.ayah} من سورة {getSurahName(selectedAyah.surah)}
              </h3>
              <button onClick={closeTafseer} className="close-button">
                <X className="w-6 h-6" />
              </button>
            </div>

            <div className="tafseer-body">
              {tafseerLoading ? (
                <div className="loading-animation">
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded w-5/6 mb-2"></div>
                  <div className="h-4 bg-gray-200 dark:bg-gray-700 rounded"></div>
                </div>
              ) : (
                <>
                  <div className="ayah-display">
                    <p className="ayah-text-large">
                      {pageData?.ayahs.find(a => a.surah === selectedAyah.surah && a.ayah === selectedAyah.ayah)?.text}
                      <span className="ayah-number-large">﴿{selectedAyah.ayah}﴾</span>
                    </p>
                  </div>

                  {/* أزرار التحكم في الصوت */}
                  <div className="audio-controls" style={{
                    display: 'flex',
                    gap: '12px',
                    justifyContent: 'center',
                    marginBottom: '20px',
                    padding: '16px',
                    background: 'rgba(16, 185, 129, 0.1)',
                    borderRadius: '12px',
                    border: '1px solid rgba(16, 185, 129, 0.2)'
                  }}>
                    {/* زر تشغيل الآية يدويًا */}
                    <button
                      onClick={() => selectedAyah && playAyahAudio(selectedAyah.surah, selectedAyah.ayah)}
                      disabled={isAudioLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: isAudioLoading ? 'not-allowed' : 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: isAudioLoading ? 0.7 : 1,
                      }}
                    >
                      {isAudioLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                      {isAudioLoading ? 'جاري تحميل الآية...' : 'تشغيل الآية'}
                    </button>
                    <button
                      onClick={() => selectedAyah && toggleSurahPlayPause(selectedAyah.surah)}
                      disabled={isLoading}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '8px 16px',
                        backgroundColor: '#10b981',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: '500',
                        transition: 'all 0.2s',
                        opacity: isLoading ? 0.7 : 1,
                      }}
                    >
                      {isLoading ? (
                        <Loader2 className="w-5 h-5 animate-spin" />
                      ) : currentSurah === selectedAyah?.surah && isSurahPlaying ? (
                        <Pause className="w-5 h-5" />
                      ) : (
                        <Volume2 className="w-5 h-5" />
                      )}
                      {isLoading ? 'جاري التحميل...' :
                        currentSurah === selectedAyah?.surah && isSurahPlaying ? 'إيقاف السورة' : 'تشغيل السورة'}
                    </button>

                    <button
                      onClick={stopAudio}
                      style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        padding: '10px 20px',
                        background: '#ef4444',
                        color: 'white',
                        border: 'none',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontSize: '16px',
                        fontWeight: '500',
                        transition: 'all 0.3s ease'
                      }}
                    >
                      <X className="w-5 h-5" />
                      إيقاف الصوت
                    </button>
                  </div>

                  <div className="tafseer-section">
                    <div className="tafseer-icon-title">
                      <Book className="w-6 h-6 text-emerald-600" />
                      <h4 className="tafseer-subtitle">التفسير:</h4>
                    </div>

                    {tafseer && (
                      <p className="tafseer-text">
                        {tafseer.text}
                      </p>
                    )}
                  </div>
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RealMushafReader; 