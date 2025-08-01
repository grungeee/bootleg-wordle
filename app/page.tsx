import { markup } from './WordleMarkup';
import Script from 'next/script';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { createServerComponentClient } from '@supabase/auth-helpers-nextjs';

export default async function HomePage() {
  const supabase = createServerComponentClient({ cookies });
  const {
    data: { session },
  } = await supabase.auth.getSession();
  if (!session) redirect('/login');

  return (
    <div>
      <main dangerouslySetInnerHTML={{ __html: markup }} />
      <Script src="/js/wordleJS.js" strategy="afterInteractive" />
    </div>
  );
}
