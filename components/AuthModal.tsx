'use client';
import { useSession, useSupabaseClient } from '@supabase/auth-helpers-react';
import { useState } from 'react';

export default function AuthModal() {
  const session = useSession();
  const supabase = useSupabaseClient();
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<'signin' | 'signup'>('signin');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    if (mode === 'signin') {
      const { error } = await supabase.auth.signInWithPassword({ email, password });
      if (error) setError(error.message); else setOpen(false);
    } else {
      const { error } = await supabase.auth.signUp({ email, password });
      if (error) setError(error.message); else setMode('signin');
    }
    setLoading(false);
  }

  if (session) return null;

  return (
    <>
      <button
        className="fixed top-2 right-2 px-3 py-1 bg-purple text-white"
        onClick={() => setOpen(true)}
      >
        Login
      </button>
      {open && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white p-4 rounded w-80">
            <h2 className="text-xl mb-4">{mode === 'signin' ? 'Sign In' : 'Sign Up'}</h2>
            {error && <p className="text-red-500 mb-2">{error}</p>}
            <form onSubmit={handleSubmit} className="flex flex-col gap-2">
              <input
                type="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="border p-2"
              />
              <input
                type="password"
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="border p-2"
              />
              <button
                type="submit"
                disabled={loading}
                className="bg-purple text-white px-4 py-2"
              >
                {loading ? 'Loading...' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
              </button>
            </form>
            <button
              className="mt-2 text-sm underline"
              onClick={() => setMode(mode === 'signin' ? 'signup' : 'signin')}
            >
              {mode === 'signin' ? 'Need an account? Sign up' : 'Already have an account? Sign in'}
            </button>
            <button
              className="mt-2 text-sm underline"
              onClick={() => setOpen(false)}
            >
              Close
            </button>
          </div>
        </div>
      )}
    </>
  );
}

