import { useState, useEffect } from 'react';
import { Modal, Button, Badge } from '@mirage/ui';
import { API_URL } from '../../config';
import type { User } from '@mirage/shared-types';

interface AdminPanelProps {
  isOpen: boolean;
  onClose: () => void;
  token: string;
}

export function AdminPanel({ isOpen, onClose, token }: AdminPanelProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchUsers = async () => {
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to fetch users');
      const data = await res.json();
      setUsers(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      setLoading(true);
      fetchUsers();
    }
  }, [isOpen, token]);

  const handleDelete = async (id: string) => {
    if (!confirm('Are you sure you want to delete this user?')) return;
    try {
      const res = await fetch(`${API_URL}/api/v1/admin/users/${id}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });
      if (!res.ok) throw new Error('Failed to delete user');
      setUsers(users.filter(u => u._id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Admin Override - User Database" maxWidth="max-w-4xl">
      <div className="p-4 bg-slate-950 text-slate-200 h-[60vh] overflow-y-auto">
        {error && <div className="text-red-400 mb-4">{error}</div>}
        
        {loading ? (
          <div>Loading database...</div>
        ) : (
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-slate-400 text-xs uppercase">
                <th className="py-3 pr-4">Name / Email</th>
                <th className="py-3 pr-4">Role</th>
                <th className="py-3 pr-4">Created</th>
                <th className="py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map(u => (
                <tr key={u._id} className="border-b border-slate-800/50 hover:bg-slate-900/50">
                  <td className="py-3 pr-4">
                    <div className="font-bold text-sm">{u.profile?.name}</div>
                    <div className="text-xs text-slate-500">{u.email}</div>
                  </td>
                  <td className="py-3 pr-4">
                    <Badge variant={u.role === 'admin' ? 'danger' : 'ghost'} className="text-xs">
                      {u.role.toUpperCase()}
                    </Badge>
                  </td>
                  <td className="py-3 pr-4 text-xs text-slate-400">
                    {new Date(u.createdAt).toLocaleDateString()}
                  </td>
                  <td className="py-3 text-right">
                    <Button variant="danger" size="sm" className="text-[10px]" onClick={() => handleDelete(u._id)}>
                      Purge
                    </Button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-500">No users found.</td>
                </tr>
              )}
            </tbody>
          </table>
        )}
        
        <div className="mt-6 flex justify-end">
          <Button variant="ghost" onClick={onClose}>Close Database</Button>
        </div>
      </div>
    </Modal>
  );
}
