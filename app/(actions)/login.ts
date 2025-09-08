'use server';
import { createClient } from '@/lib/supabase';

export async function login(username: string, password: string) {
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email: username,
    password,
  });
  if (error) throw error;
  return data;
}
