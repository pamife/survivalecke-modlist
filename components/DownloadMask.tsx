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
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Lock,
  ShieldAlert,
  Clock,
} from 'lucide-react';

interface VersionFile {
  filename: string;
  size: number;
  url: string;
  primary?: boolean;
}

interface DownloadMaskProps {
  mod: Mod;
  versions: ModVersion[];
  onClose?: () => void;
}

function formatBytes(bytes: number): string {
  if (!bytes || bytes <= 0) return '–';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

function getVersionFile(v: ModVersion): VersionFile | null {
  if (!v.files_metadata) return null;
  const files = Array.isArray(v.files_metadata) ? (v.files_metadata as any[]) : [];
  if (files.length === 0) return null;
  return files.find((f) => f.primary) || files.find((f) => f.filename?.endsWith('.jar')) || files[0];
}

export function DownloadMask({ mod, versions }: DownloadMaskProps) {
  const isBlocked = mod.status === 'blocked';

  // 1. Available Loaders
  const availableLoaders = useMemo(() => {
    const set = new Set(versions.map((v) => v.loader).filter(Boolean));
    const list = Array.from(set).sort();
    if (list.length === 0 && mod.loaders?.length) {
      return mod.loaders;
    }
    return list.length > 0 ? list : ['Fabric'];
  }, [versions, mod.loaders]);

  // Selected Loader (defaults to Fabric or first loader)
  const [selectedLoader, setSelectedLoader] = useState<string>(() => {
    const fabric = availableLoaders.find((l) => l.toLowerCase() === 'fabric');
    return fabric || availableLoaders[0] || 'Fabric';
  });

  // 2. Versions matching current Loader
  const loaderVersions = useMemo(() => {
    return versions.filter(
      (v) => v.loader?.toLowerCase() === selectedLoader.toLowerCase()
    );
  }, [versions, selectedLoader]);

  // 3. Available MC Versions for selected Loader
  const availableMcVersions = useMemo(() => {
    const set = new Set<string>();
    loaderVersions.forEach((v) => {
      if (v.minecraft_version) set.add(v.minecraft_version);
    });
    const list = Array.from(set);
    if (list.length === 0 && mod.minecraft_versions?.length) {
      return mod.minecraft_versions;
    }
    return list.length > 0 ? list : ['1.21.1'];
  }, [loaderVersions, mod.minecraft_versions]);

  // Selected MC Version (defaults to first available MC version, e.g. 1.21.1)
  const [selectedMcVersion, setSelectedMcVersion] = useState<string>(() => {
    return availableMcVersions[0] || '1.21.1';
  });

  // Ensure selectedMcVersion stays valid when loader changes
  const effectiveMcVersion = useMemo(() => {
    if (availableMcVersions.includes(selectedMcVersion)) {
      return selectedMcVersion;
    }
    return availableMcVersions[0] || '';
  }, [availableMcVersions, selectedMcVersion]);

  // 4. Versions matching Loader AND Minecraft Version
  const matchingVersions = useMemo(() => {
    return loaderVersions.filter(
      (v) => v.minecraft_version === effectiveMcVersion
    );
  }, [loaderVersions, effectiveMcVersion]);

  // 5. Determine "Neueste Version" logic:
  // "neueste version: Release, beta, alpha (außer die neueste version ist ein release dann nur der release)"
  const latestInfo = useMemo(() => {
    if (matchingVersions.length === 0) return null;

    const newest = matchingVersions[0];
    const isNewestRelease = !newest.release_type || newest.release_type === 'release';

    if (isNewestRelease) {
      // Latest version IS a release -> show ONLY this release!
      return {
        isOnlyRelease: true,
        release: newest,
        beta: null,
        alpha: null,
      };
    } else {
      // Latest version is a Beta or Alpha -> show Release, Beta, Alpha options!
      const release = matchingVersions.find((v) => !v.release_type || v.release_type === 'release') || null;
      const beta = matchingVersions.find((v) => v.release_type === 'beta') || null;
      const alpha = matchingVersions.find((v) => v.release_type === 'alpha') || null;

      return {
        isOnlyRelease: false,
        release,
        beta,
        alpha,
      };
    }
  }, [matchingVersions]);

  // 6. Manual specific version selection state
  const [showManualSelection, setShowManualSelection] = useState<boolean>(false);
  const [manuallySelectedVersionId, setManuallySelectedVersionId] = useState<string>('');

  const manuallySelectedVersion = useMemo(() => {
    if (!manuallySelectedVersionId) return null;
    return matchingVersions.find((v) => v.id === manuallySelectedVersionId) || null;
  }, [matchingVersions, manuallySelectedVersionId]);

  // Changelog modal state
  const [activeChangelogVersion, setActiveChangelogVersion] = useState<ModVersion | null>(null);

  // If mod is blocked
  if (isBlocked) {
    return (
      <div className="bg-[#14161b] border border-rose-900/60 rounded-xl p-6 sm:p-8 space-y-4">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-lg bg-rose-950/80 border border-rose-800 flex items-center justify-center text-rose-400 shrink-0">
            <Lock className="w-6 h-6" />
          </div>
          <div className="space-y-1.5">
            <h3 className="text-lg font-bold text-rose-200">
              Download gesperrt – Mod auf Survivalecke verboten
            </h3>
            <p className="text-xs sm:text-sm text-rose-300/90 leading-relaxed">
              Dieser Mod ({mod.name}) bietet unfaire Spielvorteile oder verstößt gegen die Regeln unseres Servers.
              Ein Download wird aus Gründen der Serversicherheit nicht angeboten.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-[#14161b] border border-[#262b35] rounded-xl overflow-hidden shadow-xl">
      {/* Header Banner */}
      <div className="bg-gradient-to-r from-[#171b24] to-[#12141a] border-b border-[#232730] p-5 sm:p-6 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          {mod.icon_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={mod.icon_url}
              alt=""
              className="w-10 h-10 rounded-lg bg-zinc-800 object-cover border border-[#282d38] shrink-0"
            />
          ) : (
            <div className="w-10 h-10 rounded-lg bg-zinc-800 border border-[#282d38] flex items-center justify-center text-zinc-400 font-bold text-sm shrink-0">
              {mod.name.charAt(0) || 'M'}
            </div>
          )}
          <div>
            <h3 className="text-base sm:text-lg font-bold text-white flex items-center gap-2">
              <span>{mod.name} herunterladen</span>
            </h3>
            <p className="text-xs text-zinc-400">
              Wähle deinen Mod-Loader und deine Minecraft-Version
            </p>
          </div>
        </div>

        <StatusBadge status={mod.status} size="sm" />
      </div>

      <div className="p-5 sm:p-6 space-y-6">
        {/* STEP 1: MOD-LOADER WÄHLEN */}
        <div className="space-y-2.5">
          <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
            <Cpu className="w-3.5 h-3.5 text-emerald-400" />
            <span>1. Mod-Loader auswählen</span>
          </label>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
            {availableLoaders.map((ldr) => {
              const isSelected = selectedLoader.toLowerCase() === ldr.toLowerCase();
              return (
                <button
                  key={ldr}
                  type="button"
                  onClick={() => setSelectedLoader(ldr)}
                  className={`flex items-center justify-between px-3.5 py-2.5 rounded-lg text-xs font-semibold transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-950/70 border-emerald-500 text-emerald-200 shadow-sm ring-1 ring-emerald-500/30'
                      : 'bg-[#101216] border-[#262b35] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  <span className="flex items-center gap-2">
                    <span className="capitalize">{ldr}</span>
                  </span>
                  {isSelected && <Check className="w-3.5 h-3.5 text-emerald-400 shrink-0" />}
                </button>
              );
            })}
          </div>
        </div>

        {/* STEP 2: MINECRAFT-VERSION WÄHLEN */}
        <div className="space-y-2.5">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-3.5 h-3.5 text-emerald-400" />
              <span>2. Minecraft-Version auswählen</span>
            </label>
            <span className="text-[11px] font-mono text-zinc-500">
              {availableMcVersions.length} Version{availableMcVersions.length === 1 ? '' : 'en'} verfügbar
            </span>
          </div>

          {/* Quick pills for top 6 Minecraft versions */}
          <div className="flex flex-wrap items-center gap-2">
            {availableMcVersions.slice(0, 6).map((mcVer) => {
              const isSelected = effectiveMcVersion === mcVer;
              return (
                <button
                  key={mcVer}
                  type="button"
                  onClick={() => setSelectedMcVersion(mcVer)}
                  className={`px-3 py-1.5 rounded-md text-xs font-mono font-medium transition-all cursor-pointer border ${
                    isSelected
                      ? 'bg-emerald-900/60 border-emerald-500 text-emerald-200 shadow-xs'
                      : 'bg-[#101216] border-[#262b35] text-zinc-400 hover:text-zinc-200 hover:border-zinc-600'
                  }`}
                >
                  MC {mcVer}
                </button>
              );
            })}

            {/* Dropdown for all versions if more than 6 */}
            {availableMcVersions.length > 6 && (
              <select
                value={effectiveMcVersion}
                onChange={(e) => setSelectedMcVersion(e.target.value)}
                className="bg-[#101216] border border-[#262b35] text-zinc-300 rounded-md px-3 py-1.5 text-xs font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
              >
                <option value="" disabled>
                  Weitere Versionen...
                </option>
                {availableMcVersions.map((v) => (
                  <option key={v} value={v}>
                    MC {v}
                  </option>
                ))}
              </select>
            )}
          </div>
        </div>

        {/* STEP 3: DOWNLOAD-ANZEIGE */}
        <div className="pt-2 border-t border-[#232730] space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>3. Download für {selectedLoader} (MC {effectiveMcVersion})</span>
            </span>
          </div>

          {/* If no versions match */}
          {matchingVersions.length === 0 && (
            <div className="bg-[#101216] border border-[#262b35] rounded-lg p-5 text-center space-y-2">
              <p className="text-xs text-zinc-400">
                Keine Version für <strong className="text-zinc-200">{selectedLoader}</strong> und Minecraft <strong className="text-zinc-200">{effectiveMcVersion}</strong> gefunden.
              </p>
              <p className="text-[11px] text-zinc-500">
                Bitte wähle oben einen anderen Loader oder eine andere Minecraft-Version aus.
              </p>
            </div>
          )}

          {/* FALL A: Neueste Version ist ein RELEASE -> Nur der Release wird angezeigt */}
          {latestInfo && latestInfo.isOnlyRelease && latestInfo.release && (
            <div className="space-y-2">
              <span className="text-[11px] font-semibold text-emerald-400 flex items-center gap-1">
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Neueste Version (Stabiler Release)</span>
              </span>
              <VersionDownloadCard
                version={latestInfo.release}
                modName={mod.name}
                isPrimary={true}
                onOpenChangelog={() => setActiveChangelogVersion(latestInfo.release!)}
              />
            </div>
          )}

          {/* FALL B: Neueste Version ist KEIN Release (Beta / Alpha) -> Optionen: Release, Beta, Alpha */}
          {latestInfo && !latestInfo.isOnlyRelease && (
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-[11px] font-semibold text-amber-400 flex items-center gap-1">
                  <Layers className="w-3.5 h-3.5" />
                  <span>Neueste Versionen (Release, Beta, Alpha verfügbar)</span>
                </span>
                <span className="text-[10px] text-zinc-400">Wähle deinen bevorzugten Versions-Zweig</span>
              </div>

              <div className="grid grid-cols-1 gap-2.5">
                {/* 1. Stabiler Release (falls vorhanden) */}
                {latestInfo.release && (
                  <VersionDownloadCard
                    version={latestInfo.release}
                    modName={mod.name}
                    customBadge="Stabiler Release (Empfohlen)"
                    badgeColor="emerald"
                    isPrimary={true}
                    onOpenChangelog={() => setActiveChangelogVersion(latestInfo.release!)}
                  />
                )}

                {/* 2. Neueste Beta (falls vorhanden) */}
                {latestInfo.beta && (
                  <VersionDownloadCard
                    version={latestInfo.beta}
                    modName={mod.name}
                    customBadge="Neueste Beta (Testversion)"
                    badgeColor="amber"
                    isPrimary={!latestInfo.release}
                    onOpenChangelog={() => setActiveChangelogVersion(latestInfo.beta!)}
                  />
                )}

                {/* 3. Neueste Alpha (falls vorhanden) */}
                {latestInfo.alpha && (
                  <VersionDownloadCard
                    version={latestInfo.alpha}
                    modName={mod.name}
                    customBadge="Neueste Alpha (Experimentell)"
                    badgeColor="rose"
                    isPrimary={!latestInfo.release && !latestInfo.beta}
                    onOpenChangelog={() => setActiveChangelogVersion(latestInfo.alpha!)}
                  />
                )}
              </div>
            </div>
          )}

          {/* "ABER MAN SOLL AUCH SELBST VERSIONEN AUSWÄHLEN KÖNNEN" */}
          {matchingVersions.length > 1 && (
            <div className="pt-3 border-t border-[#1e232e]">
              <button
                type="button"
                onClick={() => setShowManualSelection((prev) => !prev)}
                className="flex items-center justify-between w-full p-2.5 rounded-lg bg-[#101216] hover:bg-[#161a22] border border-[#232730] text-xs font-semibold text-zinc-300 transition-colors cursor-pointer"
              >
                <span className="flex items-center gap-2">
                  <Clock className="w-3.5 h-3.5 text-zinc-400" />
                  <span>Oder eine bestimmte Version manuell auswählen ({matchingVersions.length} Versionen)</span>
                </span>
                {showManualSelection ? (
                  <ChevronUp className="w-4 h-4 text-zinc-400" />
                ) : (
                  <ChevronDown className="w-4 h-4 text-zinc-400" />
                )}
              </button>

              {showManualSelection && (
                <div className="mt-3 space-y-3 p-3 bg-[#101216] border border-[#232730] rounded-lg animate-in fade-in duration-150">
                  <div className="space-y-1.5">
                    <label className="text-[11px] text-zinc-400 block font-medium">
                      Wähle aus allen Versionen für {selectedLoader} (MC {effectiveMcVersion}):
                    </label>
                    <select
                      value={manuallySelectedVersionId}
                      onChange={(e) => setManuallySelectedVersionId(e.target.value)}
                      className="w-full bg-[#14161b] border border-[#2c3240] text-zinc-200 rounded-md px-3 py-2 text-xs font-mono focus:outline-none focus:border-zinc-500 cursor-pointer"
                    >
                      <option value="">– Bitte eine Version auswählen –</option>
                      {matchingVersions.map((v) => {
                        const file = getVersionFile(v);
                        return (
                          <option key={v.id} value={v.id}>
                            v{v.mod_version} [{v.release_type?.toUpperCase() || 'RELEASE'}] {file ? `(${formatBytes(file.size)})` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {manuallySelectedVersion && (
                    <div className="pt-2">
                      <VersionDownloadCard
                        version={manuallySelectedVersion}
                        modName={mod.name}
                        customBadge="Manuell ausgewählte Version"
                        badgeColor="zinc"
                        isPrimary={true}
                        onOpenChangelog={() => setActiveChangelogVersion(manuallySelectedVersion)}
                      />
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Auflagenhinweis bei restricted Mods */}
          {mod.status === 'restricted' && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/20 border border-amber-800/40 text-xs text-amber-200/90">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-amber-200">Wichtig für Survivalecke: </strong>
                Dieser Mod darf auf unserem Server nur unter Einhaltung der oben gelisteten Auflagen verwendet werden.
              </div>
            </div>
          )}

          {mod.status === 'unknown' && (
            <div className="flex items-start gap-2.5 p-3 rounded-lg bg-zinc-900/60 border border-zinc-800 text-xs text-zinc-400">
              <ShieldAlert className="w-4 h-4 text-zinc-400 shrink-0 mt-0.5" />
              <div>
                <strong className="text-zinc-300">Hinweis: </strong>
                Dieser Mod ist noch ungeprüft. Nutzung erfolgt auf eigene Gefahr.
              </div>
            </div>
          )}
        </div>
      </div>

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
    </div>
  );
}

// Single Version Download Card Component
interface VersionDownloadCardProps {
  version: ModVersion;
  modName: string;
  customBadge?: string;
  badgeColor?: 'emerald' | 'amber' | 'rose' | 'zinc';
  isPrimary?: boolean;
  onOpenChangelog: () => void;
}

function VersionDownloadCard({
  version,
  modName,
  customBadge,
  badgeColor = 'emerald',
  isPrimary = false,
  onOpenChangelog,
}: VersionDownloadCardProps) {
  const file = getVersionFile(version);

  const badgeClasses = {
    emerald: 'bg-emerald-950/70 border-emerald-700/60 text-emerald-300',
    amber: 'bg-amber-950/70 border-amber-700/60 text-amber-300',
    rose: 'bg-rose-950/70 border-rose-700/60 text-rose-300',
    zinc: 'bg-zinc-800 border-zinc-700 text-zinc-300',
  }[badgeColor];

  return (
    <div
      className={`rounded-lg p-4 transition-all border ${
        isPrimary
          ? 'bg-gradient-to-r from-[#151a22] to-[#101319] border-emerald-500/40 shadow-md ring-1 ring-emerald-500/10'
          : 'bg-[#101216] border-[#232730] hover:border-zinc-600'
      }`}
    >
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="space-y-1.5 min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            {customBadge ? (
              <span className={`text-[10px] font-semibold px-2 py-0.5 rounded border ${badgeClasses}`}>
                {customBadge}
              </span>
            ) : (
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                {version.release_type || 'Release'}
              </span>
            )}
            <span className="text-xs font-bold text-white tracking-tight">
              {modName} v{version.mod_version}
            </span>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs text-zinc-400 font-mono">
            {file && <span className="truncate max-w-xs">{file.filename}</span>}
            {file && <span>•</span>}
            {file && <span className="text-zinc-300 font-semibold">{formatBytes(file.size)}</span>}
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 self-end sm:self-auto">
          {version.changelog && (
            <button
              type="button"
              onClick={onOpenChangelog}
              className="p-2 text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-md transition-colors cursor-pointer"
              title="Changelog ansehen"
            >
              <FileText className="w-4 h-4" />
            </button>
          )}

          {file ? (
            <a
              href={file.url}
              download={file.filename}
              target="_blank"
              rel="noopener noreferrer"
              className={`inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-xs font-bold transition-all cursor-pointer shadow-xs ${
                isPrimary
                  ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-emerald-600/20'
                  : 'bg-zinc-800 hover:bg-emerald-600 text-zinc-100 hover:text-white border border-zinc-700 hover:border-emerald-500'
              }`}
            >
              <FileDown className="w-4 h-4" />
              <span>.jar herunterladen</span>
            </a>
          ) : (
            <span className="text-xs text-zinc-500">Keine Datei verfügbar</span>
          )}
        </div>
      </div>
    </div>
  );
}
