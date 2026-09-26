import { useState } from 'react';
import { Modal, Button } from '@mirage/ui';
import { API_URL } from '../../config';
import type { User } from '@mirage/shared-types';

interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  token: string;
  onUserUpdate: (user: User) => void;
}

export function ProfileModal({ isOpen, onClose, user, token, onUserUpdate }: ProfileModalProps) {
  const [name, setName] = useState(user.profile?.name || '');
  const [phone, setPhone] = useState(user.profile?.phone || '');
  const [bio, setBio] = useState(user.profile?.bio || '');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    setSuccess('');
    
    try {
      const res = await fetch(`${API_URL}/api/v1/auth/profile`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ name, phone, bio }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to update profile');
      onUserUpdate(data);
      setSuccess('Profile updated successfully');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Operator Profile Maintenance" maxWidth="max-w-md">
      <div className="p-4 bg-slate-950 text-slate-200">
        {error && <div className="mb-4 text-red-400 text-sm">{error}</div>}
        {success && <div className="mb-4 text-green-400 text-sm">{success}</div>}
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs text-slate-400 mb-1">Full Name</label>
            <input
              type="text"
              required
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Phone Number</label>
            <input
              type="tel"
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm"
              value={phone}
              onChange={e => setPhone(e.target.value)}
            />
          </div>
          <div>
            <label className="block text-xs text-slate-400 mb-1">Bio / Skills</label>
            <textarea
              className="w-full px-4 py-2 bg-slate-900 border border-slate-700 rounded-lg text-sm"
              rows={3}
              value={bio}
              onChange={e => setBio(e.target.value)}
            />
          </div>
          
          <div className="flex gap-3 mt-6">
            <Button type="submit" variant="tactical-green" className="flex-1" disabled={loading}>
              {loading ? 'Saving...' : 'Save Profile'}
            </Button>
            <Button type="button" variant="ghost" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </form>
      </div>
    </Modal>
  );
}
