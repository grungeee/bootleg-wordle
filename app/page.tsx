import { markup } from './WordleMarkup';
import Script from 'next/script';
import AuthModal from '@/components/AuthModal';

export default function HomePage() {
  return (
    <div className="relative">
      <main dangerouslySetInnerHTML={{ __html: markup }} />
      <AuthModal />
      <Script src="/js/wordleJS.js" strategy="afterInteractive" />
    </div>
  );
}
