"use client";

import { useEffect, useState } from 'react';
import { AudioConsole } from './audio-console';

export function ConditionalAudioConsole() {
  const [isCallbackPage, setIsCallbackPage] = useState(false);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      setIsCallbackPage(window.location.pathname === '/auth/callback');
      
      // パスが変更された場合の監視
      const checkPath = () => {
        setIsCallbackPage(window.location.pathname === '/auth/callback');
      };
      
      window.addEventListener('popstate', checkPath);
      return () => window.removeEventListener('popstate', checkPath);
    }
  }, []);

  // コールバックページではオーディオコンソールを表示しない
  if (isCallbackPage) {
    return null;
  }

  return <AudioConsole />;
}