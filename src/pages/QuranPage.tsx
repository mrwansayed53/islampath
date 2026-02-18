import React from 'react';
import RealMushafReader from '../components/RealMushafReader';
import SEO from '../components/SEO';

const QuranPage: React.FC = () => {
  return (
    <>
      <SEO title="القرآن الكريم" description="اقرأ القرآن الكريم كاملاً مع التفسير واستمع للتلاوات." />
      <div className="fade-in">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-emerald-800 dark:text-emerald-400 mb-2 font-amiri">
            المصحف
          </h1>
          <p className="text-gray-600 dark:text-gray-400 text-lg font-noto-arabic">
            اقرأ القرآن الكريم كاملاً مع التفسير والاستماع إلى تلاوات بأصوات كبار القراء
          </p>
        </div>

        <div className="w-full">
          <RealMushafReader />
        </div>
      </div>
    </>
  );
};

export default QuranPage;