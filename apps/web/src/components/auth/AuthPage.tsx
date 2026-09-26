import { useState } from 'react';
import { motion } from 'framer-motion';
import { Button } from '@mirage/ui';
import { API_URL } from '../../config';
import type { User } from '@mirage/shared-types';

interface AuthPageProps {
  onLogin: (user: User, token: string) => void;
}

export function AuthPage({ onLogin }: AuthPageProps) {
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

  const handleDemoMode = async () => {
    setLoading(true);
    setError('');
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/demo`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: 'demo' }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Demo login failed');
      onLogin(data.user, data.token);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex h-screen items-center justify-center bg-slate-950 text-slate-200">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md p-8 glass-panel border border-slate-800 rounded-2xl shadow-2xl"
      >
        <div className="flex justify-center mb-6">
          <div className="w-16 h-16 bg-gradient-to-tr from-sky-500 to-indigo-500 rounded-full flex items-center justify-center shadow-[0_0_20px_rgba(14,165,233,0.4)]">
            <span className="text-3xl">dYZ </span>
          </div>
        </div>
        
        <h2 className="text-2xl font-bold text-center mb-8 bg-gradient-to-r from-sky-400 to-indigo-400 bg-clip-text text-transparent">
          FLARE COMMAND
        </h2>

        {error && (
          <div className="mb-4 p-3 bg-red-500/20 border border-red-500/50 rounded-lg text-red-400 text-sm">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          {!isLogin && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Full Name</label>
              <input
                type="text"
                required
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 text-sm"
                value={name}
                onChange={e => setName(e.target.value)}
              />
            </div>
          )}
          
          <div>
            <label className="block text-xs text-slate-400 mb-1">Email</label>
            <input
              type="email"
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 text-sm"
              value={email}
              onChange={e => setEmail(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs text-slate-400 mb-1">Password</label>
            <input
              type="password"
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 text-sm"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
          </div>

          {!isLogin && (
            <div>
              <label className="block text-xs text-slate-400 mb-1">Role</label>
              <select
                className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg focus:outline-none focus:border-sky-500 text-sm"
                value={role}
                onChange={e => setRole(e.target.value as any)}
              >
                <option value="responder">Field Responder</option>
                <option value="hq">HQ Commander</option>
                <option value="logistics">Logistics Coordinator</option>
              </select>
            </div>
          )}

          <Button 
            type="submit" 
            variant="glass" 
            className="w-full mt-6"
            disabled={loading}
          >
            {loading ? 'Authenticating...' : (isLogin ? 'Secure Login' : 'Register Operator')}
          </Button>
        </form>

        <div className="mt-6 text-center">
          <button 
            type="button" 
            className="text-xs text-slate-400 hover:text-white underline"
            onClick={() => setIsLogin(!isLogin)}
          >
            {isLogin ? 'Need clearance? Register here.' : 'Already have clearance? Login.'}
          </button>
        </div>

        <div className="my-6 flex items-center gap-4">
          <div className="h-px bg-slate-800 flex-1" />
          <span className="text-xs text-slate-500 uppercase tracking-widest">or</span>
          <div className="h-px bg-slate-800 flex-1" />
        </div>

        <Button 
          type="button" 
          variant="ghost" 
          className="w-full text-slate-300 hover:text-white"
          onClick={handleDemoMode}
          disabled={loading}
        >
          dY" Enter Text Demo Mode (No Login)
        </Button>
      </motion.div>
    </div>
  );
}
