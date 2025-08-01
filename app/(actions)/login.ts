'use server';
import { createClient } from '@/lib/supabase';

export async function login() {
  const supabase = createClient();
  // @ts-expect-error -- passkey API may not be typed yet
  const { data, error } = await supabase.auth.signInWithPasskey();
  if (error) throw error;
  return data;
}
