'use client';

import { useState } from 'react';
import { createClient } from '@/lib/supabase';

export default function LoginModal() {
  const supabase = createClient();
  const [open, setOpen] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  async function handleSignIn() {
    setError(null);
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) setError(error.message);
    else setOpen(false);
  }

  async function handleSignUp() {
    setError(null);
    const { error } = await supabase.auth.signUp({ email, password });
    if (error) setError(error.message);
    else setOpen(false);
  }

  if (!open) return null;

  return (
    <div className="fixed inset-0 flex items-center justify-center bg-black/50 z-50">
      <div className="bg-white p-4 rounded shadow max-w-sm w-full">
        <div className="flex justify-between mb-2">
          <h2 className="text-lg">Login</h2>
          <button onClick={() => setOpen(false)}>✕</button>
        </div>
        <input
          type="email"
          placeholder="Email"
          value={email}
          onChange={e => setEmail(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={e => setPassword(e.target.value)}
          className="border p-2 w-full mb-2"
        />
        {error && <p className="text-red mb-2">{error}</p>}
        <div className="flex gap-2">
          <button onClick={handleSignIn} className="flex-1 px-4 py-2 bg-purple text-white">
            Sign In
          </button>
          <button onClick={handleSignUp} className="flex-1 px-4 py-2 border">
            Sign Up
          </button>
        </div>
      </div>
    </div>
  );
}
