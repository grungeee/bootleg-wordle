import { markup } from './WordleMarkup';
import Script from 'next/script';
import LoginModal from '@/components/LoginModal';

export default function HomePage() {
  return (
    <div>
      <main dangerouslySetInnerHTML={{ __html: markup }} />
      <Script src="/js/wordle-words-list.js" strategy="beforeInteractive" />
      <Script src="/js/wordleJS.js" strategy="afterInteractive" />
      <LoginModal />
    </div>
  );
}
