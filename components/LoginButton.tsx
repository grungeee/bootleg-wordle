'use client';
import { useState } from 'react';
import { login } from '@/app/(actions)/login';

export default function LoginButton() {
  const [loading, setLoading] = useState(false);
  const [email, setEmail] = useState('');

  async function handleLogin() {
    setLoading(true);
    try {
      await login(email);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div>
      <input
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="email"
        className="border px-2"
      />
      <button onClick={handleLogin} disabled={loading} className="ml-2 px-4 py-2 bg-purple text-white">
        {loading ? 'Loading...' : 'Login'}
      </button>
    </div>
  );
}
