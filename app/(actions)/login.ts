'use server';
import { createClient } from '@/lib/supabase';

export async function login(email: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithOtp({ email });
  if (error) throw error;
  return data;
}
