import { supabase } from '../services/supabase';

export const diagnoseSupabaseConnection = async () => {
  console.log('🔍 بدء تشخيص اتصال قاعدة البيانات...');

  try {
    // 1. اختبار الاتصال الأساسي
    console.log('1️⃣ اختبار الاتصال الأساسي...');
    const { data: healthCheck, error: healthError } = await supabase
      .from('_test_table')
      .select('*')
      .limit(1);

    if (healthError && healthError.code !== 'PGRST106') {
      console.error('❌ فشل الاتصال الأساسي:', healthError);
      return false;
    }
    console.log('✅ الاتصال الأساسي يعمل');

    // 2. فحص وجود جدول الأحاديث
    console.log('2️⃣ فحص وجود جدول الأحاديث...');
    const { data: tableCheck, error: tableError } = await supabase
      .from('hadiths')
      .select('count')
      .limit(1);

    if (tableError) {
      if (tableError.code === 'PGRST106') {
        console.error('❌ جدول الأحاديث غير موجود في قاعدة البيانات');
        console.log('💡 يجب إنشاء جدول الأحاديث أولاً');
        return false;
      } else if (tableError.code === '42501') {
        console.error('❌ ليس لديك صلاحية للوصول لجدول الأحاديث');
        console.log('💡 يجب ضبط صلاحيات RLS في Supabase');
        return false;
      } else {
        console.error('❌ خطأ في الوصول للجدول:', tableError);
        return false;
      }
    }
    console.log('✅ جدول الأحاديث موجود');

    // 3. فحص عدد السجلات
    console.log('3️⃣ فحص عدد الأحاديث...');
    const { count, error: countError } = await supabase
      .from('hadiths')
      .select('*', { count: 'exact', head: true });

    if (countError) {
      console.error('❌ خطأ في عد الأحاديث:', countError);
      return false;
    }

    console.log(`✅ يوجد ${count || 0} حديث في قاعدة البيانات`);

    // 4. جلب حديث واحد للاختبار
    console.log('4️⃣ اختبار جلب حديث واحد...');
    const { data: sampleHadith, error: sampleError } = await supabase
      .from('hadiths')
      .select('*')
      .limit(1);

    if (sampleError) {
      console.error('❌ خطأ في جلب الأحاديث:', sampleError);
      return false;
    }

    if (!sampleHadith || sampleHadith.length === 0) {
      console.log('⚠️ الجدول فارغ - لا توجد أحاديث');
      return true; // الاتصال يعمل لكن الجدول فارغ
    }

    console.log('✅ تم جلب الأحاديث بنجاح');
    console.log('🎉 جميع الاختبارات نجحت!');
    return true;

  } catch (error: any) {
    console.error('❌ خطأ غير متوقع في التشخيص:', error);
    if (error.message?.includes('Failed to fetch')) {
      console.log('💡 المشكلة: تعذر الاتصال بالخادم');
      console.log('🔧 الحلول المقترحة:');
      console.log('   - تحقق من اتصال الإنترنت');
      console.log('   - تحقق من إعدادات Supabase URL');
      console.log('   - تحقق من صحة ANON KEY');
    }
    return false;
  }
};

// دالة لإنشاء جدول الأحاديث إذا لم يكن موجوداً
export const createHadithsTable = async () => {
  console.log('🏗️ محاولة إنشاء جدول الأحاديث...');

  try {
    const createTableSQL = `
      CREATE TABLE IF NOT EXISTS hadiths (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        hadith_text TEXT NOT NULL,
        book_name VARCHAR(255),
        narrator VARCHAR(255),
        category VARCHAR(100),
        book_number VARCHAR(50),
        hadith_number VARCHAR(50),
        grade VARCHAR(50),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      );
    `;

    // Note: هذا يتطلب صلاحيات admin في Supabase
    // يجب إنشاء الجدول من خلال SQL Editor في لوحة تحكم Supabase
    console.log('⚠️ لإنشاء الجدول، يجب تنفيذ الكود التالي في SQL Editor في Supabase:');
    console.log(createTableSQL);

    return false; // لا يمكن إنشاء الجدول من العميل
  } catch (error) {
    console.error('❌ خطأ في إنشاء الجدول:', error);
    return false;
  }
};