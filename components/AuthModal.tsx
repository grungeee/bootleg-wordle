'use client';

import { useState } from 'react';
import { login, signup } from '@/app/(actions)/auth';

export default function AuthModal() {
  const [open, setOpen] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignup, setIsSignup] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    try {
      if (isSignup) {
        await signup(email, password);
      } else {
        await login(email, password);
      }
      setOpen(false);
    } catch (err) {
      console.error(err);
      setError('Authentication failed');
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      <button
        className="absolute top-4 right-4 bg-purple text-white px-4 py-2 border-2 border-black"
        onClick={() => setOpen(true)}
      >
        {isSignup ? 'Sign Up' : 'Login'}
      </button>
      {open && (
        <div
          id="auth-modal"
          className="fixed inset-0 z-50 flex items-center justify-center bg-lavender/50"
          onClick={e => e.target === e.currentTarget && setOpen(false)}
        >
          <form
            onSubmit={handleSubmit}
            className="bg-black/75 border-2 border-black p-6 w-80 flex flex-col gap-3 text-white"
          >
            <h2 className="text-2xl font-bold text-center">
              {isSignup ? 'Create Account' : 'Sign In'}
            </h2>
            {error && <p className="text-red-400">{error}</p>}
            <input
              type="email"
              className="bg-light-grey-char border-2 border-black p-2 text-white"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="password"
              className="bg-light-grey-char border-2 border-black p-2 text-white"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-[coral] text-black font-bold border-2 border-black py-2"
            >
              {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="underline"
            >
              {isSignup ? 'Have an account? Sign In' : 'No account? Sign Up'}
            </button>
            <button type="button" onClick={() => setOpen(false)} className="underline">
              Cancel
            </button>
          </form>
        </div>
      )}
    </>
  );
}

