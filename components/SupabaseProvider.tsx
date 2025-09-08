'use client';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createPagesBrowserClient } from '@supabase/auth-helpers-nextjs';
import { useState, type ReactNode } from 'react';

export default function SupabaseProvider({ children }: { children: ReactNode }) {
  const [supabase] = useState(() => createPagesBrowserClient());
  return (
    <SessionContextProvider supabaseClient={supabase}>
      {children}
    </SessionContextProvider>
  );
}
