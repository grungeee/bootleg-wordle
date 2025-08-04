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
        className="absolute top-4 right-4 bg-purple text-white px-3 py-1 rounded"
        onClick={() => setOpen(true)}
      >
        {isSignup ? 'Sign Up' : 'Login'}
      </button>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50">
          <form
            onSubmit={handleSubmit}
            className="bg-white p-4 rounded w-80 flex flex-col gap-2"
          >
            <h2 className="text-xl text-black">
              {isSignup ? 'Create Account' : 'Sign In'}
            </h2>
            {error && <p className="text-red-500">{error}</p>}
            <input
              type="email"
              className="border p-2"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="Email"
              required
            />
            <input
              type="password"
              className="border p-2"
              value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="Password"
              required
            />
            <button
              type="submit"
              disabled={loading}
              className="bg-purple text-white py-2"
            >
              {loading ? 'Loading...' : isSignup ? 'Sign Up' : 'Login'}
            </button>
            <button
              type="button"
              onClick={() => setIsSignup(!isSignup)}
              className="text-blue-500 underline"
            >
              {isSignup ? 'Have an account? Sign In' : 'No account? Sign Up'}
            </button>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="text-gray-500"
            >
              Cancel
            </button>
          </form>
        </div>
      )}
    </>
  );
}

