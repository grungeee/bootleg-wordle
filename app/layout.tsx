import '../css/tailwind.css';
import '../css/tailwind-overrides.css';
import type { ReactNode } from 'react';
import { SessionContextProvider } from '@supabase/auth-helpers-react';
import { createBrowserSupabaseClient } from '@supabase/auth-helpers-nextjs';

export default function RootLayout({ children }: { children: ReactNode }) {
  const supabase = createBrowserSupabaseClient();
  return (
    <html lang="en">
      <body>
        <SessionContextProvider supabaseClient={supabase}>{children}</SessionContextProvider>
      </body>
    </html>
  );
}
