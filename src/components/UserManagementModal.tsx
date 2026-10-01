import React, { useState, useEffect } from 'react';
import { 
  Users, 
  UserPlus, 
  X, 
  Trash2, 
  Key, 
  ShieldCheck, 
  BookOpen, 
  AlertCircle, 
  Check, 
  Lock
} from 'lucide-react';
import { api } from '../services/api';
import { User } from '../types/notebook';

interface UserManagementModalProps {
  isOpen: boolean;
  onClose: () => void;
  currentUser: User;
  onUsersChanged?: () => void;
}

export const UserManagementModal: React.FC<UserManagementModalProps> = ({
  isOpen,
  onClose,
  currentUser,
  onUsersChanged,
}) => {
  const [users, setUsers] = useState<User[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // New User Form State
  const [isAddingUser, setIsAddingUser] = useState(false);
  const [newUsername, setNewUsername] = useState('');
  const [newDisplayName, setNewDisplayName] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<'user' | 'admin'>('user');

  // Edit / Password Reset State
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [editPassword, setEditPassword] = useState('');
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editRole, setEditRole] = useState<'user' | 'admin'>('user');

  const loadUsers = async () => {
    setIsLoading(true);
    setErrorMessage(null);
    try {
      const data = await api.getUsers();
      setUsers(data);
    } catch (err: any) {
      setErrorMessage(err.message || 'Fehler beim Laden der Benutzerliste');
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      loadUsers();
      setIsAddingUser(false);
      setEditingUser(null);
      setErrorMessage(null);
      setSuccessMessage(null);
    }
  }, [isOpen]);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newUsername.trim() || !newPassword) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.createUser({
        username: newUsername.trim(),
        displayName: newDisplayName.trim() || newUsername.trim(),
        password: newPassword,
        role: newRole,
      });

      setSuccessMessage(`Benutzer "${newUsername.trim()}" erfolgreich angelegt!`);
      setNewUsername('');
      setNewDisplayName('');
      setNewPassword('');
      setNewRole('user');
      setIsAddingUser(false);
      loadUsers();
      onUsersChanged?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fehler beim Anlegen des Benutzers');
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;

    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      await api.updateUser(editingUser.id, {
        displayName: editDisplayName.trim() || editingUser.username,
        role: editRole,
        password: editPassword.trim() ? editPassword : undefined,
      });

      setSuccessMessage(`Benutzer "${editingUser.username}" erfolgreich aktualisiert!`);
      setEditingUser(null);
      setEditPassword('');
      loadUsers();
      onUsersChanged?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fehler beim Aktualisieren des Benutzers');
    }
  };

  const handleDeleteUser = async (user: User) => {
    if (user.username === 'admin') {
      alert('Der Haupt-Administrator kann nicht gelöscht werden.');
      return;
    }

    if (user.id === currentUser.id) {
      alert('Du kannst deinen eigenen aktuell angemeldeten Benutzer nicht löschen.');
      return;
    }

    const confirm = window.confirm(
      `Möchtest du den Benutzer "${user.displayName} (${user.username})" wirklich löschen? Alle zugehörigen Schulhefte und Dateien dieses Benutzers werden entfernt.`
    );
    if (!confirm) return;

    try {
      await api.deleteUser(user.id);
      setSuccessMessage(`Benutzer "${user.username}" wurde gelöscht.`);
      loadUsers();
      onUsersChanged?.();
    } catch (err: any) {
      setErrorMessage(err.message || 'Fehler beim Löschen des Benutzers');
    }
  };

  const startEdit = (user: User) => {
    setEditingUser(user);
    setEditDisplayName(user.displayName);
    setEditRole(user.role);
    setEditPassword('');
    setIsAddingUser(false);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4 animate-in fade-in duration-200">
      <div className="w-full max-w-2xl bg-white dark:bg-stone-900 border border-stone-200 dark:border-stone-800 rounded-3xl shadow-2xl flex flex-col max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-stone-100 dark:border-stone-800 flex items-center justify-between shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-blue-100 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 flex items-center justify-center">
              <Users className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base sm:text-lg font-bold text-stone-900 dark:text-white flex items-center gap-2">
                Benutzerverwaltung
                <span className="px-2 py-0.5 text-[10px] font-bold rounded-md bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300">
                  Admin
                </span>
              </h2>
              <p className="text-xs text-stone-500 dark:text-stone-400">
                Verwalte Schüler und Administratoren mit getrennten Heft-Ordnern
              </p>
            </div>
          </div>

          <button
            onClick={onClose}
            className="p-2 rounded-xl text-stone-400 hover:text-stone-600 dark:hover:text-white hover:bg-stone-100 dark:hover:bg-stone-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-6 overflow-y-auto flex-1 space-y-5">
          {/* Notifications */}
          {errorMessage && (
            <div className="p-3.5 rounded-2xl bg-red-50 dark:bg-red-950/40 border border-red-200 dark:border-red-900/50 flex items-start gap-2.5 text-xs text-red-700 dark:text-red-300">
              <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-red-600" />
              <div className="flex-1 font-medium">{errorMessage}</div>
            </div>
          )}

          {successMessage && (
            <div className="p-3.5 rounded-2xl bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/50 flex items-start gap-2.5 text-xs text-emerald-700 dark:text-emerald-300">
              <Check className="w-4 h-4 shrink-0 mt-0.5 text-emerald-600" />
              <div className="flex-1 font-medium">{successMessage}</div>
            </div>
          )}

          {/* Action Bar: Create User Button */}
          {!isAddingUser && !editingUser && (
            <div className="flex items-center justify-between">
              <span className="text-xs font-semibold text-stone-500 uppercase tracking-wider">
                Registrierte Benutzer ({users.length})
              </span>
              <button
                onClick={() => setIsAddingUser(true)}
                className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md shadow-blue-500/20 active:scale-95 transition"
              >
                <UserPlus className="w-4 h-4" />
                <span>Neuer Benutzer</span>
              </button>
            </div>
          )}

          {/* CREATE USER FORM */}
          {isAddingUser && (
            <div className="p-4 sm:p-5 rounded-2xl border border-blue-200 dark:border-blue-900/50 bg-blue-50/30 dark:bg-blue-950/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <UserPlus className="w-4 h-4 text-blue-600" />
                  Neuen Benutzer anlegen
                </h3>
                <button
                  type="button"
                  onClick={() => setIsAddingUser(false)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleCreateUser} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Benutzername (Login) *
                    </label>
                    <input
                      type="text"
                      value={newUsername}
                      onChange={(e) => setNewUsername(e.target.value)}
                      placeholder="z. B. emma"
                      required
                      autoCapitalize="none"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Vollständiger Name
                    </label>
                    <input
                      type="text"
                      value={newDisplayName}
                      onChange={(e) => setNewDisplayName(e.target.value)}
                      placeholder="z. B. Emma Schmidt"
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Initiales Passwort *
                    </label>
                    <input
                      type="password"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      placeholder="Passwort"
                      required
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Rolle
                    </label>
                    <select
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="user">Schüler / Benutzer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsAddingUser(false)}
                    className="px-3 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-md transition"
                  >
                    Benutzer speichern
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* EDIT USER / RESET PASSWORD FORM */}
          {editingUser && (
            <div className="p-4 sm:p-5 rounded-2xl border border-amber-200 dark:border-amber-900/50 bg-amber-50/30 dark:bg-amber-950/20">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-sm font-bold text-stone-900 dark:text-white flex items-center gap-2">
                  <Key className="w-4 h-4 text-amber-600" />
                  Benutzer "{editingUser.username}" bearbeiten
                </h3>
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="text-stone-400 hover:text-stone-600 dark:hover:text-white"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              <form onSubmit={handleUpdateUser} className="space-y-3.5">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Anzeigename
                    </label>
                    <input
                      type="text"
                      value={editDisplayName}
                      onChange={(e) => setEditDisplayName(e.target.value)}
                      required
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1">
                      Rolle
                    </label>
                    <select
                      value={editRole}
                      disabled={editingUser.username === 'admin'}
                      onChange={(e) => setEditRole(e.target.value as any)}
                      className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
                    >
                      <option value="user">Schüler / Benutzer</option>
                      <option value="admin">Administrator</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-stone-600 dark:text-stone-300 mb-1 flex items-center justify-between">
                    <span>Neues Passwort setzen (optional)</span>
                    <span className="text-[10px] text-stone-400">Leer lassen = unverändert</span>
                  </label>
                  <input
                    type="password"
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Neues Passwort eingeben"
                    className="w-full px-3 py-2 text-xs bg-white dark:bg-stone-800 border border-stone-200 dark:border-stone-700 rounded-xl text-stone-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                  />
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setEditingUser(null)}
                    className="px-3 py-1.5 rounded-xl text-stone-600 dark:text-stone-300 hover:bg-stone-100 dark:hover:bg-stone-800 text-xs font-semibold"
                  >
                    Abbrechen
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-700 text-white text-xs font-bold shadow-md transition"
                  >
                    Änderungen speichern
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* USER LIST TABLE */}
          {isLoading ? (
            <div className="py-8 text-center text-xs text-stone-500">
              Lade Benutzer...
            </div>
          ) : (
            <div className="divide-y divide-stone-100 dark:divide-stone-800 border border-stone-200 dark:border-stone-800 rounded-2xl overflow-hidden bg-stone-50/30 dark:bg-stone-900/30">
              {users.map((u) => (
                <div
                  key={u.id}
                  className="p-3.5 sm:p-4 flex items-center justify-between gap-3 hover:bg-stone-100/50 dark:hover:bg-stone-800/50 transition"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    {/* User Avatar */}
                    <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-indigo-600 text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-sm">
                      {u.displayName.charAt(0).toUpperCase() || u.username.charAt(0).toUpperCase()}
                    </div>

                    <div className="min-w-0">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-xs sm:text-sm text-stone-900 dark:text-white truncate">
                          {u.displayName}
                        </span>
                        {u.role === 'admin' ? (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-purple-100 dark:bg-purple-900/40 text-purple-700 dark:text-purple-300 flex items-center gap-0.5">
                            <ShieldCheck className="w-2.5 h-2.5" />
                            Admin
                          </span>
                        ) : (
                          <span className="px-1.5 py-0.2 text-[9px] font-bold rounded bg-stone-100 dark:bg-stone-800 text-stone-600 dark:text-stone-300">
                            Schüler
                          </span>
                        )}
                      </div>
                      <div className="text-[11px] text-stone-400 flex items-center gap-2 mt-0.5">
                        <span className="font-mono">@{u.username}</span>
                        <span>•</span>
                        <span className="flex items-center gap-1">
                          <BookOpen className="w-3 h-3 text-stone-400" />
                          {u.notebookCount || 0} {(u.notebookCount || 0) === 1 ? 'Heft' : 'Hefte'}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => startEdit(u)}
                      className="p-2 rounded-xl text-stone-500 hover:text-stone-900 dark:text-stone-400 dark:hover:text-white hover:bg-stone-200/60 dark:hover:bg-stone-800 transition"
                      title="Bearbeiten / Passwort ändern"
                    >
                      <Key className="w-4 h-4" />
                    </button>

                    {u.username !== 'admin' && u.id !== currentUser.id && (
                      <button
                        onClick={() => handleDeleteUser(u)}
                        className="p-2 rounded-xl text-stone-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                        title="Benutzer löschen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Folder structure info for admin */}
          <div className="p-3.5 rounded-2xl bg-stone-100 dark:bg-stone-800/60 text-[11px] text-stone-500 dark:text-stone-400 flex items-start gap-2">
            <Lock className="w-4 h-4 shrink-0 mt-0.5 text-stone-400" />
            <div className="leading-relaxed">
              <strong>Automatische Ordnerstruktur:</strong> Jedes Schulheft wird isoliert unter{' '}
              <code className="bg-stone-200/70 dark:bg-stone-700 px-1 py-0.5 rounded font-mono">
                data/users/[benutzername]/notebooks/
              </code>{' '}
              gespeichert.
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-stone-100 dark:border-stone-800 flex justify-end shrink-0 bg-stone-50/50 dark:bg-stone-900/50">
          <button
            onClick={onClose}
            className="px-4 py-1.5 rounded-xl bg-stone-200 dark:bg-stone-800 hover:bg-stone-300 dark:hover:bg-stone-700 text-stone-800 dark:text-stone-200 text-xs font-semibold transition"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
};
