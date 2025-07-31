'use client';
import { useState } from 'react';
import { login } from '@/app/(actions)/login';

export default function LoginButton() {
  const [loading, setLoading] = useState(false);

  async function handleLogin() {
    setLoading(true);
    try {
      await login();
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <button onClick={handleLogin} disabled={loading} className="px-4 py-2 bg-purple text-white">
      {loading ? 'Loading...' : 'Sign In'}
    </button>
  );
}
