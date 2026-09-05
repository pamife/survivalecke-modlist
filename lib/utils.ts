import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import type { ModStatus } from '@/types/database';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function isValidExternalUrl(url: string | null | undefined): boolean {
  if (!url || typeof url !== 'string') return false;
  const trimmed = url.trim();
  try {
    const parsed = new URL(trimmed);
    return parsed.protocol === 'https:';
  } catch {
    return false;
  }
}

export function sanitizeUrl(url: string | null | undefined): string | null {
  if (!isValidExternalUrl(url)) return null;
  return url!.trim();
}

export function formatDate(dateString: string | null | undefined): string {
  if (!dateString) return '–';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '–';
    return new Intl.DateTimeFormat('de-DE', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    }).format(date);
  } catch {
    return '–';
  }
}

export interface StatusConfig {
  label: string;
  badgeClass: string;
  borderClass: string;
  dotClass: string;
  textClass: string;
  icon: string;
  description: string;
}

export function getStatusConfig(status: ModStatus): StatusConfig {
  switch (status) {
    case 'allowed':
      return {
        label: 'ERLAUBT',
        badgeClass: 'bg-emerald-950/60 text-emerald-400 border-emerald-800/80',
        borderClass: 'border-emerald-500/40',
        dotClass: 'bg-emerald-400',
        textClass: 'text-emerald-400',
        icon: '🟢',
        description: 'Vollständig freigegeben für das Spielen auf Survivalecke.',
      };
    case 'restricted':
      return {
        label: 'EINGESCHRÄNKT',
        badgeClass: 'bg-amber-950/60 text-amber-400 border-amber-800/80',
        borderClass: 'border-amber-500/40',
        dotClass: 'bg-amber-400',
        textClass: 'text-amber-400',
        icon: '🟡',
        description: 'Nur unter bestimmten Auflagen erlaubt. Siehe Hinweise.',
      };
    case 'blocked':
      return {
        label: 'VERBOTEN',
        badgeClass: 'bg-rose-950/60 text-rose-400 border-rose-800/80',
        borderClass: 'border-rose-500/40',
        dotClass: 'bg-rose-400',
        textClass: 'text-rose-400',
        icon: '🔴',
        description: 'Nicht gestattet. Verschafft unfaire Vorteile oder stört das Spielerlebnis.',
      };
    case 'unknown':
    default:
      return {
        label: 'NOCH NICHT GEPRÜFT',
        badgeClass: 'bg-zinc-800 text-zinc-300 border-zinc-700',
        borderClass: 'border-zinc-700',
        dotClass: 'bg-zinc-400',
        textClass: 'text-zinc-300',
        icon: '⚪',
        description: 'Dieser Mod wurde von unserem Team bisher nicht überprüft.',
      };
  }
}
