'use client';
import { useState } from 'react';
import { login } from '@/app/(actions)/login';

export default function LoginButton() {
  const [showForm, setShowForm] = useState(false);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    try {
      await login(username, password);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }

  if (showForm) {
    return (
      <form onSubmit={handleSubmit} className="p-4 bg-white rounded shadow space-y-2">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Username"
          className="border p-2 w-full"
        />
        <input
          type="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder="Password"
          className="border p-2 w-full"
        />
        <button type="submit" disabled={loading} className="px-4 py-2 bg-purple text-white w-full">
          {loading ? 'Logging in...' : 'Log in'}
        </button>
      </form>
    );
  }

  return (
    <button onClick={() => setShowForm(true)} className="px-4 py-2 bg-purple text-white">
      Log on
    </button>
  );
}
