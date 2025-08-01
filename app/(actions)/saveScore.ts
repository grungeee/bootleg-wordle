'use server';
import { createClient } from '@/lib/supabase';

export async function saveScore(value: number) {
  const supabase = createClient();
  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) throw userError;
  const { error } = await supabase
    .from('scores')
    .upsert({ user_id: user.id, value }, { onConflict: 'user_id' });
  if (error) throw error;
}
