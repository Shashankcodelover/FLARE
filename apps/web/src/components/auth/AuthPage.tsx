import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@mirage/ui';
import { API_URL } from '../../config';
import type { User } from '@mirage/shared-types';

interface AuthPageProps {
  onLogin: (user: User, token: string) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
  const [showAuthForm, setShowAuthForm] = useState(false);
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [role, setRole] = useState<'hq' | 'responder' | 'logistics'>('responder');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    
    try {
      const endpoint = isLogin ? '/api/v1/auth/login' : '/api/v1/auth/register';
      const body = isLogin 
        ? { email, password } 
        : { email, password, role, profile: { name } };

      const res = await fetch(`${API_URL}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Authentication failed');

      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDemoMode = () => {
    onLogin({ id: 'demo-123', email: 'demo@flare.local', role: 'hq', profile: { name: 'Demo User' } }, 'demo-token');
  };

  if (showAuthForm) {
    return (
      <div className="flex h-screen items-center justify-center bg-slate-50 text-slate-800">
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-md p-8 bg-white border border-slate-200 rounded-2xl shadow-xl"
        >
          <h2 className="text-2xl font-bold text-center mb-8 text-slate-800">
            {isLogin ? 'Login to FLARE' : 'Register for FLARE'}
          </h2>
          {error && <div className="mb-4 text-red-500 text-sm text-center">{error}</div>}
          <form onSubmit={handleSubmit} className="space-y-4">
            {!isLogin && (
              <input
                type="text"
                placeholder="Full Name"
                required
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            )}
            <input
              type="email"
              placeholder="Email"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
            <input
              type="password"
              placeholder="Password"
              required
              className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            {!isLogin && (
              <select
                className="w-full px-4 py-2 border border-slate-300 rounded-lg text-sm"
                value={role}
                onChange={e => setRole(e.target.value as any)}
              >
                <option value="responder">Field Responder</option>
                <option value="hq">HQ Commander</option>
                <option value="logistics">Logistics Coordinator</option>
              </select>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading ? 'Authenticating...' : (isLogin ? 'Login' : 'Register')}
            </Button>
          </form>
          <div className="mt-4 text-center">
            <button onClick={() => setIsLogin(!isLogin)} className="text-sm text-sky-600 hover:underline">
              {isLogin ? 'Need an account? Register' : 'Have an account? Login'}
            </button>
          </div>
          <div className="mt-4 text-center">
            <button onClick={() => setShowAuthForm(false)} className="text-sm text-slate-400 hover:underline">
              Back to Home
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="flex flex-col min-h-screen bg-white text-slate-900 font-sans">
      <main className="flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
        <motion.div initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.6 }}>
          <div className="mx-auto w-20 h-20 bg-gradient-to-tr from-sky-500 to-indigo-500 rounded-full flex items-center justify-center mb-8 shadow-lg">
            <span className="text-white text-4xl">⚡</span>
          </div>
          <h1 className="text-5xl md:text-6xl font-extrabold tracking-tight text-slate-900 mb-6">
            Project FLARE
          </h1>
          <p className="text-lg md:text-xl text-slate-500 mb-10 leading-relaxed max-w-2xl mx-auto">
            The decentralized disaster response coordinator. Equip field operators and HQ commanders with real-time mapping, offline-first peer-to-peer comms, and instant resource mobilization.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={() => setShowAuthForm(true)}
              className="px-8 py-4 bg-indigo-600 text-white rounded-lg font-bold shadow-md hover:bg-indigo-700 transition"
            >
              Sign Up / Login
            </button>
            <button
              onClick={handleDemoMode}
              className="px-8 py-4 bg-white text-indigo-600 border border-slate-200 rounded-lg font-bold shadow-sm hover:bg-slate-50 transition flex items-center justify-center gap-2"
            >
              ▶ Try Demo
            </button>
          </div>
        </motion.div>
      </main>
    </div>
  );
}
