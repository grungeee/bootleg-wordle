import { markup } from './WordleMarkup';
import LoginButton from '@/components/LoginButton';
import Script from 'next/script';
import { createClient } from '@/lib/supabase';
import { redirect } from 'next/navigation';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const supabase = createClient();
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) redirect('/login');
  return (
    <div>
      <LoginButton />
      <main dangerouslySetInnerHTML={{ __html: markup }} />
      <Script src="/js/wordleJS.js" strategy="afterInteractive" />
    </div>
  );
}
