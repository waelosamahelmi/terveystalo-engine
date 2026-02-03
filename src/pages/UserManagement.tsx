// ============================================================================
// SUUN TERVEYSTALO - User Management Page
// Uses global store for instant data + realtime sync
// ============================================================================

import { useState, useEffect, useMemo } from 'react';
import { supabase } from '../lib/supabase';
import { useStore } from '../lib/store';
import { User } from '../types';
import { Plus, Edit, Trash, Search, X, RefreshCw } from 'lucide-react';
import toast from 'react-hot-toast';

const UserManagement = () => {
  // Get data from global store (instant, already loaded)
  const { users, branches, refreshUsers, user: currentUser } = useStore();
  
  const [searchTerm, setSearchTerm] = useState('');
  const [showAddModal, setShowAddModal] = useState(false);
  const [showEditModal, setShowEditModal] = useState(false);
  const [selectedUser, setSelectedUser] = useState<User | null>(null);
  const isAdmin = currentUser?.role === 'admin';
  const [formData, setFormData] = useState({
    email: '',
    name: '',
    role: 'user',
    branch_id: '',
  });
  const [password, setPassword] = useState('');
  const defaultPassword = 'Password123!';

  // Branches for dropdown from store
  const availableBranches = useMemo(() => 
    branches.map(b => ({ id: b.id, name: b.name })),
    [branches]
  );

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleAddUser = () => {
    setFormData({
      email: '',
      name: '',
      role: 'user',
      branch_id: '',
    });
    setPassword(defaultPassword);
    setShowAddModal(true);
  };

  const handleEditUser = (user: User) => {
    setSelectedUser(user);
    setFormData({
      email: user.email,
      name: user.name || user.full_name || '',
      role: user.role,
      branch_id: user.branch_id || '',
    });
    setShowEditModal(true);
  };

  const handleDeleteUser = async (user: User) => {
    if (user.id === currentUser?.id) {
      toast.error('Et voi poistaa omaa käyttäjätiliäsi');
      return;
    }
    
    if (!confirm(`Haluatko varmasti poistaa käyttäjän ${user.name || user.email}?`)) {
      return;
    }
    
    try {
      const { error } = await supabase
        .from('users')
        .delete()
        .eq('id', user.id);
      
      if (error) throw error;
      
      await refreshUsers();
      toast.success('Käyttäjä poistettu');
    } catch (error) {
      console.error('Error deleting user:', error);
      toast.error('Käyttäjän poistaminen epäonnistui');
    }
  };

  const handleSaveUser = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      if (!formData.email || !formData.name) {
        toast.error('Sähköposti ja nimi vaaditaan');
        return;
      }

      if (showEditModal && selectedUser) {
        // Update existing user
        const { error } = await supabase
          .from('users')
          .update({
            name: formData.name,
            full_name: formData.name,
            role: formData.role,
            branch_id: formData.branch_id || null,
          })
          .eq('id', selectedUser.id);

        if (error) throw error;
        toast.success('Käyttäjä päivitetty');
      } else {
        // Create new user
        const { error: authError } = await supabase.auth.signUp({
          email: formData.email,
          password: password || defaultPassword,
          options: {
            data: {
              name: formData.name,
              role: formData.role,
            }
          }
        });

        if (authError) throw authError;
        toast.success('Käyttäjä luotu');
      }

      setShowAddModal(false);
      setShowEditModal(false);
      await refreshUsers();
    } catch (error: any) {
      console.error('Error saving user:', error);
      toast.error(error.message || 'Käyttäjän tallentaminen epäonnistui');
    }
  };

  const filteredUsers = users.filter(user =>
    (user.name || user.email || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
    user.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const getRoleBadge = (role: string) => {
    const colors: Record<string, string> = {
      admin: 'bg-red-100 text-red-700',
      manager: 'bg-blue-100 text-blue-700',
      user: 'bg-gray-100 text-gray-700',
    };
    const labels: Record<string, string> = {
      admin: 'Ylläpitäjä',
      manager: 'Esimies',
      user: 'Käyttäjä',
    };
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${colors[role] || colors.user}`}>
        {labels[role] || role}
      </span>
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Käyttäjähallinta</h1>
          <p className="text-gray-500 mt-1">{users.length} käyttäjää</p>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={refreshUsers}
            className="btn-secondary"
          >
            <RefreshCw size={18} />
          </button>
          {isAdmin && (
            <button onClick={handleAddUser} className="btn-primary">
              <Plus size={18} className="mr-2" />
              Lisää käyttäjä
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
        <input
          type="text"
          placeholder="Hae käyttäjiä..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="input pl-10"
        />
      </div>

      {/* Users Table */}
      <div className="card overflow-hidden">
        <table className="w-full">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Käyttäjä</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sähköposti</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Rooli</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase">Toiminnot</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {filteredUsers.length === 0 ? (
              <tr>
                <td colSpan={4} className="px-6 py-12 text-center text-gray-500">
                  Käyttäjiä ei löytynyt
                </td>
              </tr>
            ) : (
              filteredUsers.map(user => (
                <tr key={user.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4">
                    <div className="flex items-center">
                      <div className="w-10 h-10 rounded-full bg-[#00A5B5] flex items-center justify-center text-white font-medium">
                        {(user.name || user.email || 'U').charAt(0).toUpperCase()}
                      </div>
                      <div className="ml-3">
                        <p className="font-medium text-gray-900">{user.name || user.full_name || 'Ei nimeä'}</p>
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4 text-gray-500">{user.email}</td>
                  <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      <button
                        onClick={() => handleEditUser(user)}
                        className="p-2 text-gray-400 hover:text-[#00A5B5] hover:bg-gray-100 rounded-lg"
                        title="Muokkaa"
                      >
                        <Edit size={18} />
                      </button>
                      {isAdmin && user.id !== currentUser?.id && (
                        <button
                          onClick={() => handleDeleteUser(user)}
                          className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 rounded-lg"
                          title="Poista"
                        >
                          <Trash size={18} />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Add/Edit Modal */}
      {(showAddModal || showEditModal) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-2xl w-full max-w-md shadow-xl">
            <div className="flex items-center justify-between p-6 border-b">
              <h2 className="text-lg font-semibold">
                {showAddModal ? 'Lisää käyttäjä' : 'Muokkaa käyttäjää'}
              </h2>
              <button
                onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                className="p-2 hover:bg-gray-100 rounded-lg"
              >
                <X size={20} />
              </button>
            </div>
            
            <form onSubmit={handleSaveUser} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Sähköposti</label>
                <input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  disabled={showEditModal}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Nimi</label>
                <input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  className="input"
                  required
                />
              </div>
              
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Rooli</label>
                <select
                  name="role"
                  value={formData.role}
                  onChange={handleInputChange}
                  className="input"
                >
                  <option value="user">Käyttäjä</option>
                  <option value="manager">Esimies</option>
                  {isAdmin && <option value="admin">Ylläpitäjä</option>}
                </select>
              </div>

              {availableBranches.length > 0 && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Toimipiste</label>
                  <select
                    name="branch_id"
                    value={formData.branch_id}
                    onChange={handleInputChange}
                    className="input"
                  >
                    <option value="">Ei toimipistettä</option>
                    {availableBranches.map(branch => (
                      <option key={branch.id} value={branch.id}>{branch.name}</option>
                    ))}
                  </select>
                </div>
              )}

              {showAddModal && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Salasana</label>
                  <input
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="input"
                    placeholder={defaultPassword}
                  />
                  <p className="text-xs text-gray-500 mt-1">Oletussalasana: {defaultPassword}</p>
                </div>
              )}
              
              <div className="flex gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => { setShowAddModal(false); setShowEditModal(false); }}
                  className="btn-secondary flex-1"
                >
                  Peruuta
                </button>
                <button type="submit" className="btn-primary flex-1">
                  {showAddModal ? 'Lisää' : 'Tallenna'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default UserManagement;
