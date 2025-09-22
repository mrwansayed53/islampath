import React from 'react';
import { Play, Pause, SkipBack, SkipForward, Volume2, X, Loader2 } from 'lucide-react';
import { useAudio } from '../contexts/AudioContext';

const PersistentAudioPlayer: React.FC = () => {
  const {
    isPlaying,
    isLoading,
    currentTime,
    duration,
    volume,
    playingSurah,
    selectedReciter,
    surahs,
    togglePlayPause,
    playNext,
    playPrevious,
    setVolume,
    seek
  } = useAudio();

  // Don't render if no audio is playing
  if (!playingSurah) return null;

  const currentSurah = surahs.find(s => s.number === playingSurah);

  const formatTime = (seconds: number) => {
    if (!isFinite(seconds)) return '00:00';
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const handleSeek = (e: React.MouseEvent<HTMLDivElement>) => {
    if (duration === 0) return;

    const progressBar = e.currentTarget;
    const rect = progressBar.getBoundingClientRect();
    const seekPosition = (e.clientX - rect.left) / rect.width;
    const newTime = seekPosition * duration;

    seek(newTime);
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newVolume = parseFloat(e.target.value);
    setVolume(newVolume);
  };

  const stopAudio = () => {
    // This will be handled by clearing the playing surah
    // We can add this functionality to the context if needed
  };

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-white dark:bg-gray-800 shadow-2xl border-t-2 border-emerald-200 dark:border-emerald-700 z-50">
      <div className="max-w-7xl mx-auto px-4 py-3">
        {/* Main Controls Row */}
        <div className="flex items-center justify-between">
          {/* Song Info */}
          <div className="flex items-center space-x-4 flex-1 min-w-0">
            <div className="bg-emerald-600 text-white rounded-full w-10 h-10 flex items-center justify-center shadow-md flex-shrink-0">
              <span className="text-sm font-bold">{playingSurah}</span>
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-amiri text-lg font-bold text-gray-900 dark:text-gray-100 truncate">
                {currentSurah?.name || `سورة رقم ${playingSurah}`}
              </h4>
              <p className="text-sm text-gray-600 dark:text-gray-400 truncate">
                {selectedReciter?.arabic_name}
              </p>
            </div>
          </div>

          {/* Control Buttons */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <button
              onClick={playPrevious}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="السورة السابقة"
            >
              <SkipForward className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>

            <button
              onClick={togglePlayPause}
              disabled={isLoading}
              className="p-3 rounded-full bg-emerald-600 hover:bg-emerald-700 text-white transition-colors disabled:opacity-50 shadow-lg"
            >
              {isLoading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : isPlaying ? (
                <Pause className="w-5 h-5" />
              ) : (
                <Play className="w-5 h-5" />
              )}
            </button>

            <button
              onClick={playNext}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="السورة التالية"
            >
              <SkipBack className="w-5 h-5 text-gray-700 dark:text-gray-300" />
            </button>
          </div>

          {/* Volume and Close */}
          <div className="flex items-center space-x-3 flex-shrink-0">
            <div className="hidden md:flex items-center space-x-2">
              <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
              <input
                type="range"
                min="0"
                max="1"
                step="0.01"
                value={volume}
                onChange={handleVolumeChange}
                className="w-20 accent-emerald-600"
              />
              <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[30px]">
                {Math.round(volume * 100)}%
              </span>
            </div>

            <button
              onClick={stopAudio}
              className="p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
              title="إغلاق المشغل"
            >
              <X className="w-4 h-4 text-gray-600 dark:text-gray-400" />
            </button>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="flex items-center space-x-3 mt-3">
          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
            {formatTime(currentTime)}
          </span>

          <div
            className="flex-1 h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden cursor-pointer"
            onClick={handleSeek}
          >
            <div
              className="h-full bg-gradient-to-r from-emerald-500 to-emerald-600 transition-all duration-100 rounded-full"
              style={{ width: `${duration > 0 ? (currentTime / duration) * 100 : 0}%` }}
            />
          </div>

          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[40px]">
            {duration > 0 ? formatTime(duration) : '--:--'}
          </span>
        </div>

        {/* Mobile Volume Control */}
        <div className="md:hidden flex items-center justify-center space-x-2 mt-2">
          <Volume2 className="w-4 h-4 text-gray-600 dark:text-gray-400" />
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 max-w-xs accent-emerald-600"
          />
          <span className="text-xs text-gray-600 dark:text-gray-400 min-w-[30px]">
            {Math.round(volume * 100)}%
          </span>
        </div>

        {/* Keyboard Shortcuts Hint (Desktop only) */}
        <div className="hidden lg:block mt-2 text-center">
          <p className="text-xs text-gray-500 dark:text-gray-500">
            اختصارات لوحة المفاتيح: مسافة (تشغيل/إيقاف) | Ctrl+← (السابق) | Ctrl+→ (التالي) | Ctrl+↑↓ (الصوت)
          </p>
        </div>
      </div>
    </div>
  );
};

export default PersistentAudioPlayer;