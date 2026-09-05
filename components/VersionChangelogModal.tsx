'use client';

import React, { useState, useTransition } from 'react';
import { runModAnalysis } from '@/actions/analyzeMod';
import type { AnalysisRecommendation } from '@/lib/aiModAnalysis';
import {
  X,
  FileText,
  Sparkles,
  Loader2,
  ShieldCheck,
  AlertTriangle,
  ShieldAlert,
  Check,
  Info,
} from 'lucide-react';

interface VersionChangelogModalProps {
  isOpen: boolean;
  onClose: () => void;
  modName: string;
  versionNumber: string;
  releaseType?: string | null;
  publishedAt?: string | null;
  changelog?: string | null;
  onApplySuggestedRestrictions?: (restrictions: Array<{ title: string; description: string }>) => void;
}

export function VersionChangelogModal({
  isOpen,
  onClose,
  modName,
  versionNumber,
  releaseType = 'release',
  publishedAt,
  changelog,
  onApplySuggestedRestrictions,
}: VersionChangelogModalProps) {
  const [isAnalyzing, startAnalysis] = useTransition();
  const [analysisResult, setAnalysisResult] = useState<AnalysisRecommendation | null>(null);
  const [analysisError, setAnalysisError] = useState<string | null>(null);
  const [hasApplied, setHasApplied] = useState(false);

  if (!isOpen) return null;

  const handleRunAnalysis = () => {
    setAnalysisError(null);
    startAnalysis(async () => {
      const res = await runModAnalysis({
        modName,
        versionNumber,
        changelog,
      });

      if (res.success && res.data) {
        setAnalysisResult(res.data);
      } else {
        setAnalysisError(res.error || 'Analyse fehlgeschlagen.');
      }
    });
  };

  const handleApply = () => {
    if (analysisResult && onApplySuggestedRestrictions && analysisResult.suggestedRestrictions.length > 0) {
      onApplySuggestedRestrictions(analysisResult.suggestedRestrictions);
      setHasApplied(true);
    }
  };

  const formattedDate = publishedAt
    ? new Intl.DateTimeFormat('de-DE', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      }).format(new Date(publishedAt))
    : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-xs p-4">
      <div className="bg-[#14161b] border border-[#262b35] rounded-lg max-w-2xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden animate-in fade-in duration-150">
        {/* Header */}
        <div className="p-4 border-b border-[#20242e] flex items-center justify-between bg-[#101216]">
          <div className="flex items-center gap-2.5">
            <FileText className="w-5 h-5 text-emerald-400" />
            <div>
              <h3 className="text-sm font-bold text-white">
                Changelog: {modName} v{versionNumber}
              </h3>
              <div className="flex items-center gap-2 text-[11px] text-zinc-400 font-mono mt-0.5">
                <span className="uppercase px-1.5 py-0.2 rounded bg-zinc-800 border border-zinc-700 text-zinc-300">
                  {releaseType || 'Release'}
                </span>
                {formattedDate && <span>Veröffentlicht: {formattedDate}</span>}
              </div>
            </div>
          </div>

          <button
            onClick={onClose}
            className="text-zinc-400 hover:text-white p-1 rounded transition-colors cursor-pointer"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content Body */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1 text-xs text-zinc-300">
          {/* AI Analysis Trigger / Result Card */}
          <div className="bg-[#0e1014] border border-emerald-500/30 rounded-md p-3.5 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-white font-semibold text-xs">
                <Sparkles className="w-4 h-4 text-emerald-400" />
                <span>KI-Sicherheitsanalyse (Changelog & Features)</span>
              </div>
              {!analysisResult && (
                <button
                  type="button"
                  onClick={handleRunAnalysis}
                  disabled={isAnalyzing}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded text-[11px] font-semibold transition-colors cursor-pointer"
                >
                  {isAnalyzing ? (
                    <>
                      <Loader2 className="w-3 h-3 animate-spin" />
                      <span>Analysiere...</span>
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-3 h-3" />
                      <span>Changelog analysieren</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {analysisError && (
              <p className="text-rose-400 text-[11px]">{analysisError}</p>
            )}

            {analysisResult && (
              <div className="space-y-2.5 pt-2 border-t border-zinc-800 animate-in fade-in duration-200">
                <div className="flex items-center justify-between flex-wrap gap-2">
                  <div className="flex items-center gap-1.5">
                    {analysisResult.riskLevel === 'high' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-400 bg-rose-950/60 border border-rose-800/80 px-2 py-0.5 rounded">
                        <ShieldAlert className="w-3.5 h-3.5" />
                        <span>Kritisch (Hohes Risiko)</span>
                      </span>
                    )}
                    {analysisResult.riskLevel === 'medium' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-amber-400 bg-amber-950/60 border border-amber-800/80 px-2 py-0.5 rounded">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Aufmerksamkeit (Auflagen empfohlen)</span>
                      </span>
                    )}
                    {analysisResult.riskLevel === 'low' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/80 px-2 py-0.5 rounded">
                        <ShieldCheck className="w-3.5 h-3.5" />
                        <span>Unbedenklich</span>
                      </span>
                    )}
                  </div>
                  <span className="text-[10px] font-mono text-zinc-400">
                    Confidence: {analysisResult.confidence}%
                  </span>
                </div>

                <p className="text-[11px] text-zinc-300 leading-relaxed">
                  {analysisResult.summary}
                </p>

                {analysisResult.suggestedRestrictions.length > 0 && (
                  <div className="bg-[#14161b] border border-zinc-800 rounded p-2.5 space-y-1.5">
                    <span className="text-[10px] font-semibold text-amber-400 uppercase tracking-wider block">
                      Empfohlene Auflagen für Survivalecke:
                    </span>
                    <ul className="space-y-1 text-[11px] text-zinc-300 list-disc list-inside">
                      {analysisResult.suggestedRestrictions.map((r, idx) => (
                        <li key={idx}>
                          <strong>{r.title}:</strong> {r.description}
                        </li>
                      ))}
                    </ul>

                    {onApplySuggestedRestrictions && (
                      <div className="pt-1.5 flex justify-end">
                        <button
                          type="button"
                          onClick={handleApply}
                          disabled={hasApplied}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded bg-zinc-800 hover:bg-zinc-700 disabled:opacity-50 text-[11px] text-white border border-zinc-700 transition-colors cursor-pointer"
                        >
                          <Check className="w-3 h-3 text-emerald-400" />
                          <span>{hasApplied ? 'Auflagen übernommen!' : 'In Formular übernehmen'}</span>
                        </button>
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Raw Changelog Text */}
          <div className="space-y-1.5">
            <span className="text-[10px] font-semibold text-zinc-400 uppercase tracking-wider block">
              Vollständiger Versions-Changelog:
            </span>
            <div className="bg-[#0e1014] border border-zinc-800 rounded p-3 text-zinc-300 text-xs font-mono whitespace-pre-wrap leading-relaxed max-h-60 overflow-y-auto">
              {changelog?.trim() || 'Kein Changelog für diese Version auf Modrinth hinterlegt.'}
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="p-3 border-t border-[#20242e] bg-[#101216] flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-3.5 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 text-zinc-200 text-xs font-medium transition-colors cursor-pointer"
          >
            Schließen
          </button>
        </div>
      </div>
    </div>
  );
}
