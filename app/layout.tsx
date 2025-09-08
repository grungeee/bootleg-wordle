import '../css/tailwind.css';
import '../css/tailwind-overrides.css';
import type { ReactNode } from 'react';
import SupabaseProvider from '@/components/SupabaseProvider';

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body>
        <SupabaseProvider>{children}</SupabaseProvider>
      </body>
    </html>
  );
}
