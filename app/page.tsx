"use client";
import { useEffect } from 'react';
import { markup } from './WordleMarkup';
import LoginButton from '@/components/LoginButton';

export default function HomePage() {
  useEffect(() => {
    const script = document.createElement('script');
    script.src = '/js/wordleJS.js';
    script.async = true;
    document.body.appendChild(script);
  }, []);
  return (
    <div>
      <LoginButton />
      <main dangerouslySetInnerHTML={{ __html: markup }} />
    </div>
  );
}
