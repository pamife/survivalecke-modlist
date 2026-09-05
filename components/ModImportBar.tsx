'use client';

import { ModImportSearch } from '@/components/ModImportSearch';
import type { ImportedModData } from '@/actions/importMod';

interface ModImportBarProps {
  onImportSuccess: (data: ImportedModData) => void;
  onManualToggle: (showManual: boolean) => void;
  showManualOnly: boolean;
}

export function ModImportBar(props: ModImportBarProps) {
  return <ModImportSearch {...props} />;
}
