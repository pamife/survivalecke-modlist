'use client';

import React, { useState, useActionState } from 'react';
import { loginAdmin, setupInitialAdmin, type AuthState } from '@/actions/adminAuth';
import { Lock, Mail, KeyRound, Loader2, AlertCircle, ShieldAlert } from 'lucide-react';
import { useSearchParams } from 'next/navigation';

interface AdminLoginFormProps {
  hasAnyAdmin: boolean;
}

const initialAuthState: AuthState = {};

export function AdminLoginForm({ hasAnyAdmin }: AdminLoginFormProps) {
  const searchParams = useSearchParams();
  const urlError = searchParams.get('error');
  const redirectTo = searchParams.get('redirectTo') || '/admin';

  const [isSetupMode, setIsSetupMode] = useState(!hasAnyAdmin);
  const [loginState, loginAction, isLoginPending] = useActionState(loginAdmin, initialAuthState);
  const [setupState, setupAction, isSetupPending] = useActionState(setupInitialAdmin, initialAuthState);

  const activeState = isSetupMode ? setupState : loginState;
  const isPending = isSetupMode ? isSetupPending : isLoginPending;

  return (
    <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-5">
      {!hasAnyAdmin && (
        <div className="p-3 bg-amber-950/40 border border-amber-800/60 rounded text-xs text-amber-200 flex items-start gap-2">
          <ShieldAlert className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold">Erst-Einrichtung erforderlich:</span>
            <p className="mt-0.5 text-[11px] text-amber-300/80">
              Es ist noch kein Administrator-Konto hinterlegt. Erstelle jetzt das erste Team-Konto für Survivalecke.
            </p>
          </div>
        </div>
      )}

      {urlError === 'unauthorized' && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>Zugriff verweigert. Bitte mit einem Administrator-Konto anmelden.</span>
        </div>
      )}

      {activeState?.error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{activeState.error}</span>
        </div>
      )}

      <form action={isSetupMode ? setupAction : loginAction} className="space-y-4">
        <input type="hidden" name="redirectTo" value={redirectTo} />

        <div className="space-y-1.5">
          <label htmlFor="email" className="block text-xs font-semibold text-zinc-200">
            E-Mail-Adresse
          </label>
          <div className="relative flex items-center">
            <Mail className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="email"
              id="email"
              name="email"
              required
              autoComplete="email"
              placeholder="admin@survivalecke.de"
              className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label htmlFor="password" className="block text-xs font-semibold text-zinc-200">
            Passwort
          </label>
          <div className="relative flex items-center">
            <KeyRound className="absolute left-3 w-4 h-4 text-zinc-500 pointer-events-none" />
            <input
              type="password"
              id="password"
              name="password"
              required
              autoComplete={isSetupMode ? 'new-password' : 'current-password'}
              placeholder="••••••••••••"
              className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 placeholder-zinc-500 rounded py-2 pl-9 pr-3 text-xs"
            />
          </div>
        </div>

        <button
          type="submit"
          disabled={isPending}
          className="w-full inline-flex items-center justify-center gap-2 py-2.5 px-4 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>{isSetupMode ? 'Erstelle Admin-Konto...' : 'Wird eingeloggt...'}</span>
            </>
          ) : (
            <>
              <Lock className="w-3.5 h-3.5" />
              <span>{isSetupMode ? 'Erstes Admin-Konto erstellen' : 'Anmelden'}</span>
            </>
          )}
        </button>
      </form>

      {!hasAnyAdmin && (
        <div className="text-center pt-2 border-t border-[#1e222a]">
          <button
            type="button"
            onClick={() => setIsSetupMode(!isSetupMode)}
            className="text-xs text-zinc-400 hover:text-zinc-200 underline"
          >
            {isSetupMode ? 'Bereits ein Konto? Anmelden' : 'Noch kein Admin? Erst-Einrichtung'}
          </button>
        </div>
      )}
    </div>
  );
}
