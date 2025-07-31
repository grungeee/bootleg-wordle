'use server';
import { createClient } from '@/lib/supabase';

export async function saveScore(value: number) {
  const supabase = createClient();
  const { error } = await supabase.from('scores').upsert({ value }, { onConflict: 'user_id' });
  if (error) throw error;
}
