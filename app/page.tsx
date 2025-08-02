import { markup } from './WordleMarkup';
import Script from 'next/script';
import AuthModal from '@/components/AuthModal';

export default function HomePage() {
  return (
    <div>
      <main dangerouslySetInnerHTML={{ __html: markup }} />
      <Script src="/js/wordleJS.js" strategy="afterInteractive" />
      <AuthModal />
    </div>
  );
}

