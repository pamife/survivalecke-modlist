'use client';

import { useState, useTransition } from 'react';
import { updateUserRole } from '@/actions/adminUsers';
import type { UserRole, Profile } from '@/types/database';
import {
  ROLE_CONFIGS,
  getAssignableRolesForCaller,
  validateRoleChange,
} from '@/lib/permissions';
import { Shield, Check, Loader2, AlertCircle, X } from 'lucide-react';

interface UserRoleSelectorProps {
  targetUser: Profile;
  currentCaller: Profile;
  totalOwners: number;
}

export function UserRoleSelector({
  targetUser,
  currentCaller,
  totalOwners,
}: UserRoleSelectorProps) {
  const [isPending, startTransition] = useTransition();
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [isConfirmOpen, setIsConfirmOpen] = useState(false);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'error' | 'success';
    text: string;
  } | null>(null);

  const isSelf = currentCaller.id === targetUser.id;
  const assignableRoles = getAssignableRolesForCaller(currentCaller.role);

  // Can this caller modify this target user at all?
  const canModify = !isSelf && (
    currentCaller.role === 'owner' ||
    (currentCaller.role === 'project_lead' && targetUser.role !== 'owner') ||
    (currentCaller.role === 'admin' && !['owner', 'project_lead', 'admin'].includes(targetUser.role))
  );

  const handleRoleSelect = (newRole: UserRole) => {
    if (newRole === targetUser.role) return;

    const validation = validateRoleChange({
      callerId: currentCaller.id,
      callerRole: currentCaller.role,
      targetId: targetUser.id,
      targetRole: targetUser.role,
      newRole,
      totalOwners,
    });

    if (!validation.allowed) {
      setStatusMessage({ type: 'error', text: validation.reason || 'Nicht erlaubt' });
      return;
    }

    setSelectedRole(newRole);
    setIsConfirmOpen(true);
    setStatusMessage(null);
  };

  const confirmRoleChange = () => {
    if (!selectedRole) return;

    startTransition(async () => {
      const res = await updateUserRole(targetUser.id, selectedRole);
      if (res.success) {
        setStatusMessage({
          type: 'success',
          text: `Rolle erfolgreich auf ${ROLE_CONFIGS[selectedRole].label} geändert.`,
        });
        setIsConfirmOpen(false);
        setSelectedRole(null);
      } else {
        setStatusMessage({
          type: 'error',
          text: res.error || 'Fehler beim Speichern der Rolle.',
        });
      }
    });
  };

  const cancelRoleChange = () => {
    setIsConfirmOpen(false);
    setSelectedRole(null);
  };

  return (
    <div className="flex flex-col gap-1.5">
      {isSelf ? (
        <span className="text-xs text-zinc-500 italic flex items-center gap-1">
          <Shield className="w-3 h-3 text-zinc-500" />
          <span>Eigene Rolle (gesperrt)</span>
        </span>
      ) : !canModify ? (
        <span className="text-xs text-zinc-500 italic">
          Keine Berechtigung
        </span>
      ) : (
        <div className="flex items-center gap-2">
          <select
            value={targetUser.role}
            disabled={isPending}
            onChange={(e) => handleRoleSelect(e.target.value as UserRole)}
            className="bg-[#121419] border border-zinc-700/80 text-zinc-200 text-xs rounded px-2.5 py-1.5 focus:outline-none focus:border-emerald-500 hover:border-zinc-600 transition-colors cursor-pointer disabled:opacity-50"
          >
            {/* Show current role if not in assignable list */}
            {!assignableRoles.includes(targetUser.role) && (
              <option value={targetUser.role} disabled>
                {ROLE_CONFIGS[targetUser.role]?.badge || targetUser.role}
              </option>
            )}

            {assignableRoles.map((role) => (
              <option key={role} value={role}>
                {ROLE_CONFIGS[role].badge}
              </option>
            ))}
          </select>

          {isPending && <Loader2 className="w-3.5 h-3.5 text-zinc-400 animate-spin" />}
        </div>
      )}

      {statusMessage && (
        <div
          className={`text-[11px] flex items-center gap-1 ${
            statusMessage.type === 'error' ? 'text-rose-400' : 'text-emerald-400'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-3 h-3 shrink-0" />
          ) : (
            <Check className="w-3 h-3 shrink-0" />
          )}
          <span>{statusMessage.text}</span>
        </div>
      )}

      {/* Confirmation Modal */}
      {isConfirmOpen && selectedRole && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-xs p-4">
          <div className="bg-[#14161b] border border-zinc-700 rounded-lg max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between pb-3 border-b border-zinc-800">
              <div className="flex items-center gap-2">
                <Shield className="w-5 h-5 text-amber-400" />
                <h3 className="text-sm font-bold text-white">Rolle ändern bestätigen</h3>
              </div>
              <button
                onClick={cancelRoleChange}
                disabled={isPending}
                className="text-zinc-400 hover:text-white transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="text-xs text-zinc-300 space-y-3 leading-relaxed">
              <p>
                Möchtest du die Rolle für das folgende Konto wirklich anpassen?
              </p>

              <div className="bg-[#0e1014] border border-zinc-800 rounded p-3 space-y-2">
                <div className="flex justify-between">
                  <span className="text-zinc-500">Benutzer:</span>
                  <span className="font-medium text-white font-mono">{targetUser.email}</span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Aktuelle Rolle:</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                      ROLE_CONFIGS[targetUser.role]?.badgeColorClass || ''
                    }`}
                  >
                    {ROLE_CONFIGS[targetUser.role]?.badge}
                  </span>
                </div>
                <div className="flex justify-between items-center">
                  <span className="text-zinc-500">Neue Rolle:</span>
                  <span
                    className={`text-[10px] px-2 py-0.5 rounded border font-mono ${
                      ROLE_CONFIGS[selectedRole]?.badgeColorClass || ''
                    }`}
                  >
                    {ROLE_CONFIGS[selectedRole]?.badge}
                  </span>
                </div>
              </div>

              <p className="text-zinc-400 text-[11px]">
                {ROLE_CONFIGS[selectedRole]?.description}
              </p>

              {selectedRole === 'member' && targetUser.role !== 'member' && (
                <div className="p-2.5 rounded bg-amber-950/40 border border-amber-800/60 text-amber-300 text-[11px]">
                  ⚠️ Dieser Benutzer verliert sofort sämtlichen Zugriff auf das Survivalecke
                  Team-Dashboard.
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-zinc-800">
              <button
                type="button"
                onClick={cancelRoleChange}
                disabled={isPending}
                className="px-3 py-1.5 rounded text-xs text-zinc-300 hover:text-white bg-zinc-800 hover:bg-zinc-700 transition-colors"
              >
                Abbrechen
              </button>
              <button
                type="button"
                onClick={confirmRoleChange}
                disabled={isPending}
                className="px-3 py-1.5 rounded text-xs font-semibold text-white bg-emerald-600 hover:bg-emerald-500 transition-colors flex items-center gap-1.5"
              >
                {isPending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
                <span>Änderung anwenden</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
