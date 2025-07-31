import { markup } from './WordleMarkup';
import LoginButton from '@/components/LoginButton';
import Script from 'next/script';
// Home page simply renders the game markup. Authentication is handled
// client-side via the LoginButton component.

export default function HomePage() {
  return (
    <div>
      <LoginButton />
      <main dangerouslySetInnerHTML={{ __html: markup }} />
      <Script src="/js/wordleJS.js" strategy="afterInteractive" />
    </div>
  );
}
