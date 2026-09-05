'use client';

import React, { useState, useMemo } from 'react';
import type { Mod, ModVersion } from '@/types/database';
import { StatusBadge } from '@/components/StatusBadge';
import { VersionChangelogModal } from '@/components/VersionChangelogModal';
import {
  Download,
  FileDown,
  Cpu,
  Layers,
  HardDrive,
  FileText,
  AlertTriangle,
  Lock,
  CheckCircle2,
  Filter,
  ExternalLink,
  ShieldAlert,
} from 'lucide-react';

interface VersionFile {
  filename: string;
  size: number;
  url: string;
  primary?: boolean;
  hashes?: {
    sha1?: string;
    sha512?: string;
  };
}

interface VersionDownloadSectionProps {
  mod: Mod;
  versions: ModVersion[];
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function VersionDownloadSection({ mod, versions }: VersionDownloadSectionProps) {
  const [selectedLoader, setSelectedLoader] = useState<string>('');
  const [selectedMcVersion, setSelectedMcVersion] = useState<string>('');
  const [activeChangelogVersion, setActiveChangelogVersion] = useState<ModVersion | null>(null);

  // Extract primary / best file for a version
  const getPrimaryFile = (v: ModVersion): VersionFile | null => {
    if (!v.files_metadata) return null;
    const files = Array.isArray(v.files_metadata)
      ? (v.files_metadata as unknown as VersionFile[])
      : [];
    if (files.length === 0) return null;

    // Prefer primary file
    const primary = files.find((f) => f.primary);
    if (primary) return primary;

    // Prefer .jar file
    const jar = files.find((f) => f.filename?.endsWith('.jar'));
    if (jar) return jar;

    return files[0];
  };

  // Find latest primary recommended release version
  const primaryVersion = useMemo(() => {
    if (versions.length === 0) return null;
    // Prefer release over beta/alpha
    const releases = versions.filter((v) => v.release_type === 'release' || !v.release_type);
    const candidate = releases.length > 0 ? releases[0] : versions[0];
    return candidate;
  }, [versions]);

  const primaryFile = primaryVersion ? getPrimaryFile(primaryVersion) : null;

  // Filter options
  const availableLoaders = useMemo(() => {
    return Array.from(new Set(versions.map((v) => v.loader).filter(Boolean))).sort();
  }, [versions]);

  const availableMcVersions = useMemo(() => {
    return Array.from(new Set(versions.map((v) => v.minecraft_version).filter(Boolean)));
  }, [versions]);

  // Filtered versions list
  const filteredVersions = useMemo(() => {
    return versions.filter((v) => {
      if (selectedLoader && v.loader !== selectedLoader) return false;
      if (selectedMcVersion && v.minecraft_version !== selectedMcVersion) return false;
      return true;
    });
  }, [versions, selectedLoader, selectedMcVersion]);

  const isBlocked = mod.status === 'blocked';

  return (
    <section id="download" className="space-y-6 pt-2">
      {/* SECTION HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#232730] pb-3">
        <div className="space-y-0.5">
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <Download className="w-5 h-5 text-emerald-400" />
            <span>Download & Versionen</span>
          </h2>
          <p className="text-xs text-zinc-400">
            Direkte .jar-Dateien für deinen Minecraft-Client
          </p>
        </div>

        {versions.length > 0 && (
          <span className="text-xs font-mono text-zinc-400 bg-[#14161b] px-2.5 py-1 rounded border border-[#232730] self-start sm:self-auto">
            {versions.length} Version{versions.length === 1 ? '' : 'en'} verfügbar
          </span>
        )}
      </div>

      {/* PRIMARY RECOMMENDED DOWNLOAD CARD */}
      {isBlocked ? (
        /* BLOCKED WARNING BANNER */
        <div className="bg-rose-950/30 border border-rose-800/60 rounded-lg p-5 sm:p-6 space-y-3">
          <div className="flex items-start gap-3.5">
            <div className="w-10 h-10 rounded-lg bg-rose-900/50 border border-rose-700 flex items-center justify-center text-rose-300 shrink-0">
              <Lock className="w-5 h-5" />
            </div>
            <div className="space-y-1">
              <h3 className="text-base font-bold text-rose-200">
                Download deaktiviert – Mod ist auf Survivalecke verboten
              </h3>
              <p className="text-xs sm:text-sm text-rose-300/90 leading-relaxed">
                Dieser Mod ({mod.name}) bietet unfaire Spielvorteile oder verstößt gegen die Serverregeln von Survivalecke.
                Ein Download wird aus Sicherheitsgründen nicht zur Verfügung gestellt.
              </p>
            </div>
          </div>
        </div>
      ) : primaryVersion && primaryFile ? (
        /* ACTIVE PRIMARY DOWNLOAD HERO CARD */
        <div className="bg-linear-to-br from-[#141820] to-[#0f1218] border border-emerald-500/40 rounded-lg p-5 sm:p-6 space-y-4 shadow-lg ring-1 ring-emerald-500/10">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300 bg-emerald-950/70 border border-emerald-700/60 px-2 py-0.5 rounded">
                  <CheckCircle2 className="w-3 h-3 text-emerald-400" />
                  <span>Neueste empfohlene Version</span>
                </span>
                <span className="text-xs font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                  {primaryVersion.release_type || 'Release'}
                </span>
              </div>

              <div>
                <h3 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
                  <span>{mod.name} v{primaryVersion.mod_version}</span>
                </h3>
                <p className="text-xs text-zinc-400 font-mono mt-0.5 truncate max-w-md">
                  {primaryFile.filename}
                </p>
              </div>

              {/* Version metadata pills */}
              <div className="flex flex-wrap items-center gap-3 text-xs text-zinc-300 pt-1">
                <span className="inline-flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-mono">MC {primaryVersion.minecraft_version}</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="inline-flex items-center gap-1">
                  <Cpu className="w-3.5 h-3.5 text-zinc-400" />
                  <span>{primaryVersion.loader}</span>
                </span>
                <span className="text-zinc-600">•</span>
                <span className="inline-flex items-center gap-1">
                  <HardDrive className="w-3.5 h-3.5 text-zinc-400" />
                  <span className="font-mono">{formatBytes(primaryFile.size)}</span>
                </span>
              </div>
            </div>

            {/* Direct Download Button */}
            <div className="flex flex-col sm:flex-row md:flex-col items-stretch sm:items-center md:items-end gap-2 shrink-0">
              <a
                href={primaryFile.url}
                download={primaryFile.filename}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center justify-center gap-2 px-5 py-3 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm rounded-lg shadow-md hover:shadow-emerald-600/20 transition-all cursor-pointer group"
              >
                <FileDown className="w-4 h-4 group-hover:translate-y-0.5 transition-transform" />
                <span>.jar herunterladen ({formatBytes(primaryFile.size)})</span>
              </a>

              {primaryVersion.changelog && (
                <button
                  type="button"
                  onClick={() => setActiveChangelogVersion(primaryVersion)}
                  className="inline-flex items-center justify-center gap-1.5 text-xs text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer py-1 px-2"
                >
                  <FileText className="w-3.5 h-3.5" />
                  <span>Changelog ansehen</span>
                </button>
              )}
            </div>
          </div>

          {/* Conditional Restriction Warning Under Primary Download */}
          {mod.status === 'restricted' && (
            <div className="pt-3 border-t border-[#1e232e] flex items-start gap-2.5 text-xs text-amber-300/90 bg-amber-950/20 rounded p-2.5 border border-amber-800/30">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-amber-200">Auflagen beachten: </span>
                Dieser Mod darf auf Survivalecke nur unter Einhaltung der oben genannten Bedingungen genutzt werden.
              </div>
            </div>
          )}

          {mod.status === 'unknown' && (
            <div className="pt-3 border-t border-[#1e232e] flex items-start gap-2.5 text-xs text-zinc-400 bg-zinc-900/60 rounded p-2.5 border border-zinc-800">
              <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-zinc-300">Hinweis: </span>
                Dieser Mod ist noch ungeprüft. Nutzung auf dem Server erfolgt auf eigenes Risiko.
              </div>
            </div>
          )}
        </div>
      ) : (
        /* Fallback if no direct file parsed yet */
        <div className="bg-[#14161b] border border-[#232730] rounded-lg p-5 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-zinc-300">
          <div className="space-y-1 text-center sm:text-left">
            <h4 className="font-semibold text-zinc-200">Keine direkten Dateien in der lokalen Datenbank</h4>
            <p className="text-zinc-400">
              Du kannst diesen Mod direkt über die offizielle Projektseite herunterladen.
            </p>
          </div>
          {(mod.source_url || mod.modrinth_url || mod.website_url) && (
            <a
              href={mod.source_url || mod.modrinth_url || mod.website_url || '#'}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-600 text-white font-semibold rounded text-xs transition-colors shrink-0"
            >
              <ExternalLink className="w-3.5 h-3.5" />
              <span>Auf Modrinth herunterladen</span>
            </a>
          )}
        </div>
      )}

      {/* ALL VERSIONS TABLE / LIST (Only when multiple versions available) */}
      {versions.length > 0 && !isBlocked && (
        <div className="bg-[#14161b] border border-[#232730] rounded-lg p-4 sm:p-5 space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <h3 className="text-sm font-bold text-white flex items-center gap-2">
              <Filter className="w-4 h-4 text-zinc-400" />
              <span>Alle verfügbaren Versionen</span>
            </h3>

            {/* Loader & MC Version Filters */}
            <div className="flex flex-wrap items-center gap-2">
              {availableLoaders.length > 1 && (
                <select
                  value={selectedLoader}
                  onChange={(e) => setSelectedLoader(e.target.value)}
                  className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer"
                >
                  <option value="">Alle Loader</option>
                  {availableLoaders.map((ldr) => (
                    <option key={ldr} value={ldr}>
                      {ldr}
                    </option>
                  ))}
                </select>
              )}

              {availableMcVersions.length > 1 && (
                <select
                  value={selectedMcVersion}
                  onChange={(e) => setSelectedMcVersion(e.target.value)}
                  className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded px-2 py-1 text-xs focus:outline-none focus:border-zinc-500 cursor-pointer font-mono"
                >
                  <option value="">Alle Minecraft-Versionen</option>
                  {availableMcVersions.map((v) => (
                    <option key={v} value={v}>
                      MC {v}
                    </option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Table of Versions */}
          <div className="overflow-x-auto -mx-4 px-4 sm:mx-0 sm:px-0">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="border-b border-[#232730] text-[11px] text-zinc-400 font-semibold uppercase tracking-wider bg-[#101216]">
                  <th className="py-2.5 px-3">Version</th>
                  <th className="py-2.5 px-3">Minecraft</th>
                  <th className="py-2.5 px-3">Loader</th>
                  <th className="py-2.5 px-3">Typ</th>
                  <th className="py-2.5 px-3">Dateigröße</th>
                  <th className="py-2.5 px-3">Status</th>
                  <th className="py-2.5 px-3 text-right">Download</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#1e222a]">
                {filteredVersions.map((ver) => {
                  const file = getPrimaryFile(ver);
                  const verStatus = ver.status || mod.status;

                  return (
                    <tr key={ver.id} className="hover:bg-[#181b22] transition-colors group">
                      <td className="py-2.5 px-3 font-mono font-medium text-zinc-200">
                        <div className="flex items-center gap-2">
                          <span>{ver.mod_version}</span>
                          {ver.changelog && (
                            <button
                              type="button"
                              onClick={() => setActiveChangelogVersion(ver)}
                              className="text-zinc-500 hover:text-zinc-300 p-0.5 rounded cursor-pointer"
                              title="Changelog ansehen"
                            >
                              <FileText className="w-3.5 h-3.5" />
                            </button>
                          )}
                        </div>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-300">
                        {ver.minecraft_version}
                      </td>
                      <td className="py-2.5 px-3 text-zinc-300">{ver.loader}</td>
                      <td className="py-2.5 px-3">
                        <span
                          className={`text-[10px] uppercase font-mono px-1.5 py-0.2 rounded ${
                            ver.release_type === 'beta'
                              ? 'bg-amber-950/60 text-amber-400 border border-amber-800/50'
                              : ver.release_type === 'alpha'
                              ? 'bg-rose-950/60 text-rose-400 border border-rose-800/50'
                              : 'bg-zinc-800 text-zinc-300'
                          }`}
                        >
                          {ver.release_type || 'Release'}
                        </span>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-zinc-400">
                        {file ? formatBytes(file.size) : '–'}
                      </td>
                      <td className="py-2.5 px-3">
                        <StatusBadge status={verStatus} size="sm" />
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {verStatus === 'blocked' ? (
                          <span className="text-[11px] text-rose-400 font-medium inline-flex items-center gap-1">
                            <Lock className="w-3 h-3" />
                            <span>Gesperrt</span>
                          </span>
                        ) : file ? (
                          <a
                            href={file.url}
                            download={file.filename}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-zinc-800 hover:bg-emerald-600 text-zinc-200 hover:text-white rounded text-[11px] font-medium transition-colors cursor-pointer"
                            title={file.filename}
                          >
                            <FileDown className="w-3.5 h-3.5" />
                            <span>.jar</span>
                          </a>
                        ) : (
                          <span className="text-zinc-600 text-[11px]">–</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* CHANGELOG MODAL */}
      {activeChangelogVersion && (
        <VersionChangelogModal
          isOpen={Boolean(activeChangelogVersion)}
          onClose={() => setActiveChangelogVersion(null)}
          modName={mod.name}
          versionNumber={activeChangelogVersion.mod_version}
          releaseType={activeChangelogVersion.release_type}
          publishedAt={activeChangelogVersion.published_at}
          changelog={activeChangelogVersion.changelog}
        />
      )}
    </section>
  );
}
