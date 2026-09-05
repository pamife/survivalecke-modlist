'use client';

import { useState, useMemo } from 'react';
import type { Profile, UserRole } from '@/types/database';
import { ROLE_CONFIGS, isStaffRole } from '@/lib/permissions';
import { UserRoleSelector } from '@/components/UserRoleSelector';
import { Search, Users, Shield, Filter } from 'lucide-react';

interface UserManagementTableProps {
  users: Profile[];
  currentCaller: Profile;
  totalOwners: number;
}

export function UserManagementTable({
  users,
  currentCaller,
  totalOwners,
}: UserManagementTableProps) {
  const [searchQuery, setSearchQuery] = useState('');
  const [filterTab, setFilterTab] = useState<'all' | 'staff' | 'member' | UserRole>('all');

  const filteredUsers = useMemo(() => {
    return users.filter((user) => {
      // 1. Search filter
      const matchesSearch =
        searchQuery.trim() === '' ||
        user.email?.toLowerCase().includes(searchQuery.toLowerCase().trim()) ||
        user.id.toLowerCase().includes(searchQuery.toLowerCase().trim());

      if (!matchesSearch) return false;

      // 2. Tab filter
      if (filterTab === 'all') return true;
      if (filterTab === 'staff') return isStaffRole(user.role);
      if (filterTab === 'member') return user.role === 'member';
      return user.role === filterTab;
    });
  }, [users, searchQuery, filterTab]);

  return (
    <div className="space-y-4">
      {/* Controls Bar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 bg-[#14161b] border border-[#232730] p-3 rounded-lg">
        {/* Search */}
        <div className="relative flex-1 max-w-md">
          <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Benutzer nach E-Mail oder ID durchsuchen..."
            className="w-full pl-9 pr-3 py-1.5 bg-[#0e1014] border border-zinc-700/80 rounded text-xs text-zinc-200 placeholder-zinc-500 focus:outline-none focus:border-emerald-500 transition-colors"
          />
        </div>

        {/* Filter Tabs */}
        <div className="flex items-center gap-1 overflow-x-auto text-xs">
          <button
            onClick={() => setFilterTab('all')}
            className={`px-2.5 py-1.5 rounded font-medium transition-colors shrink-0 ${
              filterTab === 'all'
                ? 'bg-zinc-700 text-white'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Alle ({users.length})
          </button>
          <button
            onClick={() => setFilterTab('staff')}
            className={`px-2.5 py-1.5 rounded font-medium transition-colors shrink-0 flex items-center gap-1 ${
              filterTab === 'staff'
                ? 'bg-emerald-950/80 border border-emerald-700/80 text-emerald-300'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            <Shield className="w-3 h-3 text-emerald-400" />
            <span>Team ({users.filter((u) => isStaffRole(u.role)).length})</span>
          </button>
          <button
            onClick={() => setFilterTab('member')}
            className={`px-2.5 py-1.5 rounded font-medium transition-colors shrink-0 ${
              filterTab === 'member'
                ? 'bg-zinc-800 border border-zinc-700 text-zinc-200'
                : 'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800'
            }`}
          >
            Spieler ({users.filter((u) => u.role === 'member').length})
          </button>
        </div>
      </div>

      {/* Users Table */}
      <div className="bg-[#14161b] border border-[#232730] rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="border-b border-[#232730] bg-[#101216] text-zinc-400 font-medium">
                <th className="py-3 px-4">Benutzer / E-Mail</th>
                <th className="py-3 px-4">Aktuelle Rolle</th>
                <th className="py-3 px-4 hidden md:table-cell">Registriert am</th>
                <th className="py-3 px-4 text-right">Rollenverwaltung</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#1e222a]">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-zinc-500">
                    Keine Benutzer gefunden, die den Kriterien entsprechen.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const roleConfig = ROLE_CONFIGS[user.role] || ROLE_CONFIGS.member;
                  const isSelf = user.id === currentCaller.id;
                  const formattedDate = user.created_at
                    ? new Intl.DateTimeFormat('de-DE', {
                        day: '2-digit',
                        month: '2-digit',
                        year: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit',
                      }).format(new Date(user.created_at))
                    : 'Unbekannt';

                  return (
                    <tr
                      key={user.id}
                      className={`hover:bg-[#181b22] transition-colors ${
                        isSelf ? 'bg-zinc-900/30' : ''
                      }`}
                    >
                      {/* Email & ID */}
                      <td className="py-3 px-4">
                        <div className="flex flex-col">
                          <div className="flex items-center gap-1.5">
                            <span className="font-semibold text-zinc-200">
                              {user.email || 'Keine E-Mail'}
                            </span>
                            {isSelf && (
                              <span className="text-[10px] bg-zinc-800 text-zinc-400 px-1.5 py-0.2 rounded font-mono">
                                Du
                              </span>
                            )}
                          </div>
                          <span className="text-[10px] text-zinc-500 font-mono">
                            ID: {user.id}
                          </span>
                        </div>
                      </td>

                      {/* Role Badge */}
                      <td className="py-3 px-4">
                        <span
                          className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[11px] font-mono border ${roleConfig.badgeColorClass}`}
                        >
                          {roleConfig.badge}
                        </span>
                      </td>

                      {/* Created At */}
                      <td className="py-3 px-4 text-zinc-400 font-mono text-[11px] hidden md:table-cell">
                        {formattedDate}
                      </td>

                      {/* Actions */}
                      <td className="py-3 px-4 text-right">
                        <div className="flex justify-end">
                          <UserRoleSelector
                            targetUser={user}
                            currentCaller={currentCaller}
                            totalOwners={totalOwners}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
