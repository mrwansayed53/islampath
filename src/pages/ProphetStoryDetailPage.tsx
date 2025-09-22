import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowRight, Book, Star, Heart, Share2, Copy } from 'lucide-react';
import toast from 'react-hot-toast';

// استيراد بيانات القصص من الصفحة الرئيسية
import { prophetStories } from './ProphetsStoriesPage';

const ProphetStoryDetailPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [isFavorite, setIsFavorite] = useState(false);
  
  // العثور على القصة بناءً على المعرف
  const story = prophetStories.find((p: any) => p.id === id);

  useEffect(() => {
    // التحقق من المفضلة من التخزين المحلي
    const favorites = JSON.parse(localStorage.getItem('favoriteStories') || '[]');
    setIsFavorite(favorites.includes(id));
  }, [id]);

  if (!story) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-4">
            لم يتم العثور على القصة
          </h1>
          <button
            onClick={() => navigate('/prophets-stories')}
            className="bg-emerald-600 text-white px-6 py-3 rounded-lg hover:bg-emerald-700 transition-colors"
          >
            العودة لقصص الأنبياء
          </button>
        </div>
      </div>
    );
  }

  const toggleFavorite = () => {
    const favorites = JSON.parse(localStorage.getItem('favoriteStories') || '[]');
    const newFavorites = isFavorite 
      ? favorites.filter((fav: string) => fav !== id)
      : [...favorites, id];
    
    localStorage.setItem('favoriteStories', JSON.stringify(newFavorites));
    setIsFavorite(!isFavorite);
    
    toast.success(isFavorite ? '❌ تم إزالة القصة من المفضلة' : '⭐ تم إضافة القصة للمفضلة');
  };

  const copyStory = async () => {
    const text = `قصة النبي ${story.arabicName}\n\n${story.fullStory}`;

    try {
      // التحقق من دعم clipboard API
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
        toast.success('📋 تم نسخ القصة بنجاح!');
      } else {
        // استخدام طريقة بديلة للمتصفحات القديمة
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        textArea.style.top = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();

        try {
          const successful = document.execCommand('copy');
          if (successful) {
            toast.success('📋 تم نسخ القصة بنجاح!');
          } else {
            throw new Error('execCommand failed');
          }
        } catch (fallbackErr) {
          toast.error('فشل في نسخ القصة. يرجى تحديد النص ونسخه يدوياً');
        } finally {
          document.body.removeChild(textArea);
        }
      }
    } catch (err) {
      console.error('Copy error:', err);
      toast.error('فشل في نسخ القصة. يرجى المحاولة مرة أخرى');
    }
  };

  const shareStory = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: `قصة النبي ${story.arabicName}`,
          text: story.fullStory.substring(0, 100) + '...',
          url: window.location.href
        });
      } catch (err) {
        copyStory();
      }
    } else {
      copyStory();
    }
  };

  return (
    <div className="fade-in">
      {/* شريط التنقل العلوي */}
      <div className="mb-6">
        <button
          onClick={() => navigate('/prophets-stories')}
          className="flex items-center text-emerald-600 dark:text-emerald-400 hover:text-emerald-700 dark:hover:text-emerald-300 transition-colors"
        >
          <ArrowRight className="w-5 h-5 ml-2" />
          العودة إلى قصص الأنبياء
        </button>
      </div>

      {/* رأس القصة */}
      <div className="bg-gradient-to-r from-emerald-600 to-blue-600 rounded-xl p-8 mb-8 text-white">
        <div className="flex flex-col md:flex-row justify-between items-start gap-4">
          <div className="flex-1">
            <h1 className="text-4xl font-bold font-amiri mb-2">
              قصة النبي {story.arabicName}
            </h1>
            <p className="text-emerald-100 text-lg mb-4">
              {story.name}
            </p>
            <div className="flex items-center space-x-4 space-x-reverse">
              <div className="flex items-center bg-white/20 rounded-lg px-3 py-1">
                <Book className="w-4 h-4 ml-2" />
                <span className="text-sm">قصة نبي</span>
              </div>
              <div className="flex items-center bg-white/20 rounded-lg px-3 py-1">
                <Star className="w-4 h-4 ml-2" />
                <span className="text-sm">تعليمية</span>
              </div>
            </div>
          </div>
          
          {/* أزرار التفاعل */}
          <div className="flex space-x-2 space-x-reverse">
            <button
              onClick={toggleFavorite}
              className={`p-3 rounded-lg transition-all ${
                isFavorite 
                  ? 'bg-yellow-500 text-white' 
                  : 'bg-white/20 hover:bg-white/30 text-white'
              }`}
            >
              <Heart className={`w-5 h-5 ${isFavorite ? 'fill-current' : ''}`} />
            </button>
            
            <button
              onClick={copyStory}
              className="p-3 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <Copy className="w-5 h-5" />
            </button>
            
            <button
              onClick={shareStory}
              className="p-3 rounded-lg bg-white/20 hover:bg-white/30 text-white transition-all"
            >
              <Share2 className="w-5 h-5" />
            </button>
          </div>
        </div>
      </div>

      {/* محتوى القصة */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 p-6 md:p-8">
        <div className="prose prose-lg max-w-none dark:prose-invert">
          <div className="text-gray-800 dark:text-gray-200 leading-relaxed text-lg font-noto-arabic whitespace-pre-line">
            {story.fullStory}
          </div>
        </div>

        {/* الدروس المستفادة */}
        {story.lessons && story.lessons.length > 0 && (
          <div className="mt-8 p-6 bg-emerald-50 dark:bg-emerald-900/20 rounded-lg border border-emerald-200 dark:border-emerald-700">
            <h3 className="text-xl font-bold text-emerald-800 dark:text-emerald-400 mb-4 font-amiri">
              💡 الدروس المستفادة
            </h3>
            <ul className="space-y-2">
              {story.lessons.map((lesson: string, index: number) => (
                <li key={index} className="flex items-start">
                  <span className="text-emerald-600 dark:text-emerald-400 ml-2">•</span>
                  <span className="text-gray-700 dark:text-gray-300">{lesson}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>

      {/* اقتراحات قصص أخرى */}
      <div className="mt-12">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 mb-6 font-amiri">
          قصص أخرى قد تعجبك
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {prophetStories
            .filter((p: any) => p.id !== id)
            .slice(0, 3)
            .map((prophet: any) => (
              <div 
                key={prophet.id}
                onClick={() => navigate(`/prophets-stories/${prophet.id}`)}
                className="bg-white dark:bg-gray-800 rounded-xl shadow-lg border border-gray-200 dark:border-gray-700 overflow-hidden cursor-pointer transform hover:scale-105 transition-all"
              >
                <div className="h-32 bg-gradient-to-br from-emerald-500 to-blue-600 flex items-center justify-center">
                  <span className="text-4xl text-white">📖</span>
                </div>
                <div className="p-4">
                  <h3 className="text-lg font-bold text-gray-900 dark:text-gray-100 font-amiri mb-2">
                    النبي {prophet.arabicName}
                  </h3>
                  <p className="text-gray-600 dark:text-gray-400 text-sm line-clamp-2">
                    {prophet.shortDescription}
                  </p>
                </div>
              </div>
            ))}
        </div>
      </div>
    </div>
  );
};

export default ProphetStoryDetailPage; 