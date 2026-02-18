import { createClient } from '@supabase/supabase-js';
import type { Hadith, Dhikr, Reciter } from '../types';

// Initialize Supabase client
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseKey) {
  throw new Error('Missing Supabase environment variables');
}

export const supabase = createClient(supabaseUrl, supabaseKey);

// ── Hadiths ──────────────────────────────────────────

export const addHadith = async (hadith: Omit<Hadith, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('hadiths')
    .insert([hadith])
    .select();

  if (error) throw error;
  return data[0] as Hadith;
};

export const getHadiths = async (): Promise<Hadith[]> => {
  const { data, error } = await supabase
    .from('hadiths')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Hadith[];
};

export const updateHadith = async (id: string, hadith: Partial<Hadith>) => {
  const { data, error } = await supabase
    .from('hadiths')
    .update(hadith)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0] as Hadith;
};

export const deleteHadith = async (id: string) => {
  const { error } = await supabase
    .from('hadiths')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ── Prophet Stories ──────────────────────────────────

interface ProphetStoryDB {
  id: string;
  name: string;
  arabic_name: string;
  short_description: string;
  full_story: string;
  quran_references: string[];
  created_at?: string;
}

export const addProphetStory = async (story: Omit<ProphetStoryDB, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('prophet_stories')
    .insert([story])
    .select();

  if (error) throw error;
  return data[0] as ProphetStoryDB;
};

export const getProphetStories = async (): Promise<ProphetStoryDB[]> => {
  const { data, error } = await supabase
    .from('prophet_stories')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as ProphetStoryDB[];
};

export const updateProphetStory = async (id: string, story: Partial<ProphetStoryDB>) => {
  const { data, error } = await supabase
    .from('prophet_stories')
    .update(story)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0] as ProphetStoryDB;
};

export const deleteProphetStory = async (id: string) => {
  const { error } = await supabase
    .from('prophet_stories')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ── Adhkar ───────────────────────────────────────────

export const addDhikr = async (dhikr: Omit<Dhikr, 'id' | 'created_at' | 'updated_at'>) => {
  const { data, error } = await supabase
    .from('adhkar')
    .insert([dhikr])
    .select();

  if (error) throw error;
  return data[0] as Dhikr;
};

export const getAdhkar = async (): Promise<Dhikr[]> => {
  const { data, error } = await supabase
    .from('adhkar')
    .select('*')
    .order('created_at', { ascending: false });

  if (error) throw error;
  return data as Dhikr[];
};

export const updateDhikr = async (id: string, dhikr: Partial<Dhikr>) => {
  const { data, error } = await supabase
    .from('adhkar')
    .update(dhikr)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0] as Dhikr;
};

export const deleteDhikr = async (id: string) => {
  const { error } = await supabase
    .from('adhkar')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// ── Reciters ─────────────────────────────────────────

export const addReciter = async (reciter: Omit<Reciter, 'id' | 'created_at'>) => {
  const { data, error } = await supabase
    .from('reciters')
    .insert([reciter])
    .select();

  if (error) throw error;
  return data[0] as Reciter;
};

export const getReciters = async (): Promise<Reciter[]> => {
  const { data, error } = await supabase
    .from('reciters')
    .select('*')
    .order('arabic_name', { ascending: true });

  if (error) throw error;
  return data as Reciter[];
};

export const updateReciter = async (id: string, reciter: Partial<Reciter>) => {
  const { data, error } = await supabase
    .from('reciters')
    .update(reciter)
    .eq('id', id)
    .select();

  if (error) throw error;
  return data[0] as Reciter;
};

export const deleteReciter = async (id: string) => {
  const { error } = await supabase
    .from('reciters')
    .delete()
    .eq('id', id);

  if (error) throw error;
};

// فحص وجود قارئ معين
export const checkReciterExists = async (arabicName: string) => {
  const { data, error } = await supabase
    .from('reciters')
    .select('id, arabic_name')
    .eq('arabic_name', arabicName)
    .single();

  if (error && error.code !== 'PGRST116') throw error;
  return data;
};

// تنظيف القراء المتكررة
export const cleanDuplicateReciters = async () => {
  const { data: reciters, error } = await supabase
    .from('reciters')
    .select('*');

  if (error) throw error;

  const uniqueReciters = new Map<string, Reciter>();
  const duplicates: string[] = [];

  reciters?.forEach((reciter: Reciter) => {
    if (uniqueReciters.has(reciter.arabic_name)) {
      duplicates.push(reciter.id);
    } else {
      uniqueReciters.set(reciter.arabic_name, reciter);
    }
  });

  if (duplicates.length > 0) {
    const { error: deleteError } = await supabase
      .from('reciters')
      .delete()
      .in('id', duplicates);

    if (deleteError) throw deleteError;
  }

  return duplicates.length;
};

// اختبار الاتصال بقاعدة البيانات
export const testDatabaseConnection = async () => {
  try {
    const { error } = await supabase
      .from('reciters')
      .select('count')
      .limit(1);

    if (error) throw error;
    return true;
  } catch {
    return false;
  }
};

// عدد السجلات في جدول معين
export const getTableCount = async (tableName: string): Promise<number> => {
  const { count, error } = await supabase
    .from(tableName)
    .select('*', { count: 'exact', head: true });

  if (error) throw error;
  return count ?? 0;
};