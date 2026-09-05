'use server';

import { requireStaff } from '@/lib/auth';
import { analyzeModContent, type AnalysisRecommendation } from '@/lib/aiModAnalysis';

export async function runModAnalysis({
  modName,
  description,
  changelog,
  versionNumber,
}: {
  modName: string;
  description?: string | null;
  changelog?: string | null;
  versionNumber?: string;
}): Promise<{ success: boolean; data?: AnalysisRecommendation; error?: string }> {
  await requireStaff();

  try {
    const result = await analyzeModContent({
      modName,
      description,
      changelog,
      versionNumber,
    });

    return { success: true, data: result };
  } catch (err: unknown) {
    console.error('runModAnalysis error:', err);
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Fehler bei der Mod-Analyse.',
    };
  }
}
