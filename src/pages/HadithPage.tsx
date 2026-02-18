import React, { useState, useEffect } from 'react';
import { BookOpen, Search, Star, Share2, Copy, Filter, ChevronDown, ChevronUp } from 'lucide-react';
import toast from 'react-hot-toast';
import { supabase } from '../services/supabase';


interface Hadith {
  id: string;
  hadith_text: string;
  book_name: string;
  narrator: string;
  category: string;
  book_number: string;
  hadith_number: string;
  grade: string;
  created_at?: string;
}

interface Category {
  id: string;
  name: string;
  description: string;
  icon: string;
}

const HadithPage: React.FC = () => {
  const [, setHadiths] = useState<Hadith[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredHadiths, setFilteredHadiths] = useState<Hadith[]>([]);
  const [favoriteHadiths, setFavoriteHadiths] = useState<string[]>([]);
  const [expandedHadith, setExpandedHadith] = useState<string | null>(null);
  const [showFilters, setShowFilters] = useState(false);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const hadithsPerPage = 10;

  // جلب الأحاديث من قاعدة البيانات
  const fetchHadiths = async (page = 1, category = 'all', search = '') => {
    try {
      setLoading(true);

      // أولاً: التحقق من الاتصال بقاعدة البيانات
      const { error: testError } = await supabase
        .from('hadiths')
        .select('count')
        .limit(1);

      if (testError) {
        console.error('Database connection error:', testError);
        if (testError.code === 'PGRST106') {
          toast.error('جدول الأحاديث غير موجود في قاعدة البيانات');
        } else if (testError.code === '42501') {
          toast.error('ليس لديك صلاحية للوصول لجدول الأحاديث');
        } else {
          toast.error(`خطأ في الاتصال بقاعدة البيانات: ${testError.message}`);
        }
        return;
      }

      let query = supabase
        .from('hadiths')
        .select('*', { count: 'exact' });

      // تطبيق فلتر الفئة
      if (category !== 'all') {
        query = query.eq('category', category);
      }

      // تطبيق البحث
      if (search.trim()) {
        query = query.or(`hadith_text.ilike.%${search}%,narrator.ilike.%${search}%,book_name.ilike.%${search}%`);
      }

      // تطبيق الترقيم
      const from = (page - 1) * hadithsPerPage;
      const to = from + hadithsPerPage - 1;

      query = query
        .range(from, to)
        .order('created_at', { ascending: false });

      const { data, error, count } = await query;

      if (error) {
        console.error('Error fetching hadiths:', error);
        if (error.code === 'PGRST116') {
          toast.error('لا توجد أحاديث في قاعدة البيانات');
        } else if (error.code === '42501') {
          toast.error('ليس لديك صلاحية لقراءة الأحاديث');
        } else {
          toast.error(`خطأ في جلب الأحاديث: ${error.message}`);
        }
        return;
      }

      console.log('Fetched hadiths:', data?.length, 'total:', count);

      if (!data || data.length === 0) {
        toast.error('لا توجد أحاديث متاحة حالياً');
        setHadiths([]);
        setTotalCount(0);
        setFilteredHadiths([]);
        return;
      }

      setHadiths(data);
      setTotalCount(count || 0);
      setFilteredHadiths(data);

    } catch (error: unknown) {
      console.error('Unexpected error:', error);
      const errMsg = error instanceof Error ? error.message : 'خطأ غير معروف';
      if (errMsg.includes('Failed to fetch')) {
        toast.error('تعذر الاتصال بالخادم. تحقق من اتصال الإنترنت');
      } else {
        toast.error(`خطأ غير متوقع: ${errMsg}`);
      }
    } finally {
      setLoading(false);
    }
  };

  // جلب الفئات المتاحة
  const fetchCategories = async () => {
    try {
      const { data, error } = await supabase
        .from('hadiths')
        .select('category')
        .not('category', 'is', null);

      if (error) {
        console.error('Error fetching categories:', error);
        if (error.code === 'PGRST106') {
          console.warn('جدول الأحاديث غير موجود - تعذر جلب الفئات');
        }
        return;
      }

      if (!data || data.length === 0) {
        console.warn('لا توجد فئات متاحة');
        setCategories([]);
        return;
      }

      // استخراج الفئات الفريدة
      const uniqueCategories = [...new Set(data?.map(item => item.category) || [])];

      const categoriesWithIcons = uniqueCategories.map(cat => ({
        id: cat,
        name: cat,
        description: `أحاديث في ${cat}`,
        icon: getCategoryIcon(cat)
      }));

      setCategories(categoriesWithIcons);
      console.log(`تم جلب ${categoriesWithIcons.length} فئة`);
    } catch (error: unknown) {
      console.error('Error fetching categories:', error);
      if (error instanceof Error && error.message?.includes('Failed to fetch')) {
        console.warn('تعذر الاتصال بالخادم لجلب الفئات');
      }
    }
  };

  // الحصول على أيقونة الفئة
  const getCategoryIcon = (category: string): string => {
    const iconMap: { [key: string]: string } = {
      'الإيمان والعقيدة': '☪️',
      'الطهارة والصلاة': '🕌',
      'الزكاة والصدقة': '💰',
      'الصيام': '🌙',
      'الحج والعمرة': '🕋',
      'الأخلاق': '❤️',
      'العلم': '📚',
      'النساء والأسرة': '👨‍👩‍👧‍👦',
      'الذكر والدعاء': '🤲',
      'الجنة والنار': '🌟',
      'العدل والإنصاف': '⚖️',
      'الصبر والابتلاء': '💪',
      'التوبة': '🤲',
      'الرحمة': '💝'
    };
    return iconMap[category] || '📖';
  };

  useEffect(() => {
    fetchHadiths();
    fetchCategories();

    // جلب المفضلة من التخزين المحلي
    const savedFavorites = localStorage.getItem('favoriteHadiths');
    if (savedFavorites) {
      setFavoriteHadiths(JSON.parse(savedFavorites));
    }

  }, []);

  // تحديث الأحاديث عند تغيير الفلاتر
  useEffect(() => {
    fetchHadiths(currentPage, selectedCategory, searchQuery);
  }, [selectedCategory, searchQuery, currentPage]);

  // Scroll to top when hadith is expanded
  useEffect(() => {
    console.log('expandedHadith changed:', expandedHadith);
    if (expandedHadith) {
      window.scrollTo({ top: 0, behavior: 'smooth' });
    }
  }, [expandedHadith]);

  // Get the expanded hadith object
  const selectedHadith = expandedHadith ? filteredHadiths.find(h => h.id === expandedHadith) : null;

  const toggleFavorite = (hadithId: string) => {
    const newFavorites = favoriteHadiths.includes(hadithId)
      ? favoriteHadiths.filter(id => id !== hadithId)
      : [...favoriteHadiths, hadithId];

    setFavoriteHadiths(newFavorites);
    localStorage.setItem('favoriteHadiths', JSON.stringify(newFavorites));

    toast.success(
      favoriteHadiths.includes(hadithId)
        ? 'تم إزالة الحديث من المفضلة'
        : 'تم إضافة الحديث للمفضلة'
    );
  };

  const copyHadith = (hadith: Hadith) => {
    const text = `${hadith.hadith_text}\n\nالراوي: ${hadith.narrator}\nالمصدر: ${hadith.book_name}\nالدرجة: ${hadith.grade}`;
    navigator.clipboard.writeText(text);
    toast.success('تم نسخ الحديث');
  };

  const shareHadith = (hadith: Hadith) => {
    if (navigator.share) {
      navigator.share({
        title: 'حديث شريف',
        text: `${hadith.hadith_text}\n\nالراوي: ${hadith.narrator}\nالمصدر: ${hadith.book_name}`,
      });
    } else {
      copyHadith(hadith);
    }
  };

  const totalPages = Math.ceil(totalCount / hadithsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-emerald-50 to-teal-100 dark:bg-gradient-to-br dark:from-gray-900 dark:to-gray-800 py-8">
      <div className="container mx-auto px-4">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="bg-emerald-100 w-20 h-20 rounded-full flex items-center justify-center mx-auto mb-6">
            <BookOpen className="w-10 h-10 text-emerald-600" />
          </div>
          <h1 className="text-4xl font-bold text-emerald-800 mb-4 font-amiri">
            الأحاديث النبوية الشريفة
          </h1>
          <p className="text-lg text-gray-600 max-w-3xl mx-auto font-noto-arabic">
            مجموعة من الأحاديث النبوية الصحيحة مع شرح وفوائد لكل حديث
          </p>
          <div className="mt-4 text-sm text-gray-500">
            إجمالي الأحاديث: {totalCount}
          </div>
        </div>

        {/* Expanded Hadith View */}
        {selectedHadith && (
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-lg p-8 mb-8 border-r-4 border-emerald-500 dark:border-emerald-700">
            <div className="flex justify-between items-start mb-6">
              <h2 className="text-2xl font-bold text-emerald-800 font-amiri">الحديث الشريف</h2>
              <button
                onClick={() => setExpandedHadith(null)}
                className="px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                ← العودة للقائمة
              </button>
            </div>

            <div className="mb-6">
              <div className="flex gap-2 mb-4">
                <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedHadith.category}
                </span>
                <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                  {selectedHadith.grade}
                </span>
              </div>

              <div className="bg-emerald-50 p-6 rounded-lg mb-6">
                <p className="text-xl leading-relaxed text-gray-800 dark:text-gray-200 font-noto-arabic text-center">
                  {selectedHadith.hadith_text}
                </p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-gray-700">
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-emerald-800 mb-2">الراوي</h4>
                  <p>{selectedHadith.narrator}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-emerald-800 mb-2">المصدر</h4>
                  <p>{selectedHadith.book_name}</p>
                </div>
                <div className="text-center p-4 bg-gray-50 rounded-lg">
                  <h4 className="font-bold text-emerald-800 mb-2">رقم الحديث</h4>
                  <p>{selectedHadith.hadith_number}</p>
                </div>
              </div>
            </div>

            <div className="flex justify-center gap-4 pt-4 border-t">
              <button
                onClick={() => toggleFavorite(selectedHadith.id)}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${favoriteHadiths.includes(selectedHadith.id)
                  ? 'bg-yellow-100 text-yellow-700'
                  : 'bg-gray-100 text-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
              >
                <Star className="w-5 h-5" />
                {favoriteHadiths.includes(selectedHadith.id) ? 'إزالة من المفضلة' : 'إضافة للمفضلة'}
              </button>

              <button
                onClick={() => copyHadith(selectedHadith)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Copy className="w-5 h-5" />
                نسخ
              </button>

              <button
                onClick={() => shareHadith(selectedHadith)}
                className="flex items-center gap-2 px-4 py-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
              >
                <Share2 className="w-5 h-5" />
                مشاركة
              </button>
            </div>
          </div>
        )}

        {/* Search and Filters */}
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 mb-8">
          <div className="flex flex-col lg:flex-row gap-4 items-center">
            <div className="relative flex-1">
              <Search className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 dark:text-gray-500 w-5 h-5" />
              <input
                type="text"
                placeholder="ابحث في الأحاديث..."
                value={searchQuery}
                onChange={(e) => {
                  setSearchQuery(e.target.value);
                  setCurrentPage(1);
                }}
                className="w-full pr-10 pl-4 py-3 bg-white dark:bg-gray-900 border border-gray-300 dark:border-gray-600 text-gray-800 dark:text-gray-200 placeholder-gray-400 dark:placeholder-gray-500 rounded-lg focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 font-noto-arabic"
              />
            </div>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className="flex items-center gap-2 px-4 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              <Filter className="w-5 h-5" />
              الفئات
              {showFilters ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
            </button>
          </div>

          {/* Categories Filter */}
          {showFilters && (
            <div className="mt-6 border-t pt-6">
              <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
                <button
                  onClick={() => {
                    setSelectedCategory('all');
                    setCurrentPage(1);
                  }}
                  className={`p-3 rounded-lg text-sm font-medium transition-colors ${selectedCategory === 'all'
                    ? 'bg-emerald-600 text-white'
                    : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                >
                  📚 جميع الفئات
                </button>
                {categories.map((category) => (
                  <button
                    key={category.id}
                    onClick={() => {
                      setSelectedCategory(category.id);
                      setCurrentPage(1);
                    }}
                    className={`p-3 rounded-lg text-sm font-medium transition-colors ${selectedCategory === category.id
                      ? 'bg-emerald-600 text-white'
                      : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                      }`}
                  >
                    {category.icon} {category.name}
                  </button>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Loading State */}
        {loading && (
          <div className="text-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-500 mx-auto mb-4"></div>
            <p className="text-gray-600">جاري تحميل الأحاديث...</p>
          </div>
        )}

        {/* Hadiths List */}
        {!loading && (
          <>
            <div className={`grid gap-6 ${selectedHadith ? 'opacity-50' : ''}`}>
              {filteredHadiths.map((hadith) => (
                <div
                  key={hadith.id}
                  className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-6 hover:shadow-lg transition-shadow cursor-pointer"
                  onClick={() => {
                    console.log('Hadith clicked:', hadith.id, hadith.hadith_text.substring(0, 50));
                    setExpandedHadith(hadith.id);
                  }}
                >
                  <div className="flex justify-between items-start mb-4">
                    <div className="flex items-center gap-2">
                      <span className="bg-emerald-100 text-emerald-800 px-3 py-1 rounded-full text-sm font-medium">
                        {hadith.category}
                      </span>
                      <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                        {hadith.grade}
                      </span>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleFavorite(hadith.id);
                        }}
                        className={`p-2 rounded-lg transition-colors ${favoriteHadiths.includes(hadith.id)
                          ? 'bg-yellow-100 text-yellow-600'
                          : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                          }`}
                      >
                        <Star className="w-5 h-5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          copyHadith(hadith);
                        }}
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Copy className="w-5 h-5" />
                      </button>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          shareHadith(hadith);
                        }}
                        className="p-2 bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-200 dark:hover:bg-gray-600 transition-colors"
                      >
                        <Share2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  <div className="mb-4">
                    <p className="text-lg leading-relaxed text-gray-800 dark:text-gray-200 font-noto-arabic">
                      {hadith.hadith_text}
                    </p>
                  </div>

                  <div className="border-t pt-4">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm text-gray-600">
                      <div>
                        <span className="font-medium">الراوي:</span> {hadith.narrator}
                      </div>
                      <div>
                        <span className="font-medium">المصدر:</span> {hadith.book_name}
                      </div>
                      <div>
                        <span className="font-medium">رقم الحديث:</span> {hadith.hadith_number}
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {/* Pagination */}
            {totalPages > 1 && (
              <div className="mt-8 flex justify-center">
                <div className="flex gap-2">
                  <button
                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                    disabled={currentPage === 1}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    السابق
                  </button>

                  <span className="px-4 py-2 bg-emerald-600 text-white rounded-lg">
                    {currentPage} من {totalPages}
                  </span>

                  <button
                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                    disabled={currentPage === totalPages}
                    className="px-4 py-2 bg-white dark:bg-gray-700 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:cursor-not-allowed disabled:opacity-50"
                  >
                    التالي
                  </button>
                </div>
              </div>
            )}

            {/* No Results */}
            {filteredHadiths.length === 0 && !loading && (
              <div className="text-center py-12">
                <BookOpen className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-medium text-gray-600 dark:text-gray-300 mb-2">لا توجد أحاديث</h3>
                <p className="text-gray-500 dark:text-gray-400 mb-6">
                  {searchQuery || selectedCategory !== 'all'
                    ? 'جرب تغيير معايير البحث أو الفلتر'
                    : 'لا توجد أحاديث في قاعدة البيانات حالياً'
                  }
                </p>
                <div className="flex gap-4 justify-center">
                  <button
                    onClick={() => {
                      setSearchQuery('');
                      setSelectedCategory('all');
                      setCurrentPage(1);
                      fetchHadiths();
                    }}
                    className="px-6 py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
                  >
                    إعادة تحميل الأحاديث
                  </button>

                  {(searchQuery || selectedCategory !== 'all') && (
                    <button
                      onClick={() => {
                        setSearchQuery('');
                        setSelectedCategory('all');
                        setCurrentPage(1);
                      }}
                      className="px-6 py-3 bg-gray-500 text-white rounded-lg hover:bg-gray-600 transition-colors"
                    >
                      مسح الفلاتر
                    </button>
                  )}
                </div>
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default HadithPage;