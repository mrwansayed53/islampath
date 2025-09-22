import React, { useState, useEffect } from 'react';
import SEO from '../components/SEO';
import { useAudio } from '../contexts/AudioContext';
import { Headphones, Play, Pause, Download, Search, Volume2, SkipBack, SkipForward, Loader2 } from 'lucide-react';
import toast from 'react-hot-toast';

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
  const {
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
  } = useAudio();

  const [filteredSurahs, setFilteredSurahs] = useState(surahs);
  const [searchQuery, setSearchQuery] = useState('');
  const [surahInput, setSurahInput] = useState<string>('');

  // Update filtered surahs when surahs change
  useEffect(() => {
    setFilteredSurahs(surahs);
  }, [surahs]);

  // مزامنة حقل الإدخال مع السورة الحالية عند التغيير
  useEffect(() => {
    if (playingSurah) {
      setSurahInput(playingSurah.toString());
    }
  }, [playingSurah]);

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

  // Handle reciter change
  const handleReciterChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const reciterId = e.target.value;
    setReciter(reciterId);
  };

  // Handle download
  const handleDownload = (surahNumber: number, surahName: string) => {
    if (!selectedReciter) return;

    const formattedSurahNumber = surahNumber.toString().padStart(3, '0');
    const downloadUrl = `${selectedReciter.audio_base_url}/${formattedSurahNumber}.mp3`;

    window.open(downloadUrl, '_blank');
    toast.success(`جاري تحميل سورة ${surahName}`);
  };

  // Handle seek
  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const seekPosition = (e.clientX - rect.left) / rect.width;
    const newTime = seekPosition * duration;

    seek(newTime);
  };

  // Handle volume change
  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  // Format time (seconds to MM:SS)
  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Get next/previous surah
  const getNextSurah = () => {
    if (!playingSurah) return null;
    return playingSurah < 114 ? playingSurah + 1 : 1;
  };

  const getPreviousSurah = () => {
    if (!playingSurah) return null;
    return playingSurah > 1 ? playingSurah - 1 : 114;
  };

  // دالة للتحكم في التشغيل والإيقاف
  const handleTogglePlayPause = async (surahNumber: number, surahName: string) => {
    if (!selectedReciter) return;

    // إذا كانت السورة الحالية تعمل، أوقفها أو شغلها
    if (playingSurah === surahNumber) {
      togglePlayPause();
    } else {
      // إذا كانت سورة مختلفة، شغل السورة الجديدة
      await playAudio(selectedReciter.id, surahNumber, surahName);
    }
  };

  return (
    <>
      <SEO title="المصحف المسموع" description="استمع إلى القرآن الكريم بأصوات مجموعة من القراء مع إمكانية التحميل." />
      <div className="min-h-screen bg-gradient-to-br pb-32">
        <div className="fade-in">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-400 mb-2 font-amiri">
              المصحف المسموع
            </h1>
            <p className="text-gray-600 dark:text-gray-400 text-lg font-noto-arabic">
              استمع إلى القرآن الكريم بأصوات أشهر القراء في العالم الإسلامي
            </p>
            <p className="text-sm text-gray-500 dark:text-gray-500 mt-2">
              💡 يمكنك الآن الاستماع أثناء تصفح الصفحات الأخرى أو حتى خارج المتصفح
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
                    onClick={togglePlayPause}
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

          {/* Surahs Grid */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg overflow-hidden border border-gray-200 dark:border-gray-700">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 p-6">
              {filteredSurahs.map((surah) => (
                <div
                  key={surah.number}
                  className={`border-2 rounded-xl p-6 transition-all duration-300 cursor-pointer transform hover:scale-105 ${
                    playingSurah === surah.number
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
                      <span className={`text-xs py-1 px-3 rounded-full inline-block ${
                        surah.revelationType === 'Meccan'
                          ? 'bg-orange-100 dark:bg-orange-900/30 text-orange-800 dark:text-orange-400'
                          : 'bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-400'
                      }`}>
                        {surah.revelationType === 'Meccan' ? 'مكية' : 'مدنية'}
                      </span>
                    </div>
                    <div className={`rounded-full w-12 h-12 flex items-center justify-center shadow-md ${
                      playingSurah === surah.number
                        ? 'bg-emerald-600 text-white'
                        : 'bg-emerald-100 dark:bg-emerald-900/50 text-emerald-800 dark:text-emerald-400'
                    }`}>
                      <span className="text-sm font-bold">{surah.number}</span>
                    </div>
                  </div>

                  <div className="flex justify-between items-center mt-6 gap-3">
                    <button
                      onClick={() => handleTogglePlayPause(surah.number, surah.name)}
                      disabled={!selectedReciter || isLoading}
                      className={`flex items-center px-4 py-3 rounded-lg transition-all duration-200 disabled:opacity-50 flex-1 justify-center font-medium ${
                        playingSurah === surah.number && isPlaying
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

          {/* Keyboard Shortcuts Info */}
          <div className="mt-6 bg-blue-50 dark:bg-blue-900/20 rounded-lg p-4 border border-blue-200 dark:border-blue-800">
            <h4 className="font-semibold text-blue-800 dark:text-blue-400 mb-2">اختصارات لوحة المفاتيح:</h4>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2 text-sm text-blue-700 dark:text-blue-300">
              <div>• <kbd className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">مسافة</kbd> - تشغيل/إيقاف</div>
              <div>• <kbd className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">Ctrl + ←</kbd> - السورة السابقة</div>
              <div>• <kbd className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">Ctrl + →</kbd> - السورة التالية</div>
              <div>• <kbd className="bg-blue-200 dark:bg-blue-800 px-2 py-1 rounded">Ctrl + ↑↓</kbd> - مستوى الصوت</div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default AudioQuranPage;