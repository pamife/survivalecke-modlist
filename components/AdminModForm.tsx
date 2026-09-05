'use client';

import React, { useState, useActionState } from 'react';
import { createMod, updateMod, type ModActionResult } from '@/actions/adminMods';
import { ModImportSearch } from '@/components/ModImportSearch';
import { StatusBadge } from '@/components/StatusBadge';
import { VersionChangelogModal } from '@/components/VersionChangelogModal';
import { useRouter } from 'next/navigation';
import {
  Save,
  Loader2,
  AlertCircle,
  ArrowLeft,
  Eye,
  Edit3,
  Plus,
  Trash2,
  ExternalLink,
  ShieldAlert,
  FileText,
  Check,
} from 'lucide-react';
import Link from 'next/link';
import type { Mod, ModStatus, ModSource, ModRestriction, ModVersion } from '@/types/database';
import type { ImportedModData, ExternalModVersion } from '@/actions/importMod';

interface AdminModFormProps {
  mod?: Mod;
  initialValues?: Partial<Mod>;
  initialRestrictions?: ModRestriction[];
  initialVersions?: ModVersion[];
}

interface StructuredRestrictionItem {
  id: string;
  title: string;
  description: string;
}

interface ConfigurableVersionItem {
  id: string;
  mod_version: string;
  minecraft_version: string;
  loader: string;
  status: 'allowed' | 'restricted' | 'blocked' | 'unknown';
  note: string;
  source_version_id?: string;
  published_at?: string;
  release_type?: string;
  changelog?: string;
  files_metadata?: any;
}

const initialResult: ModActionResult = {};

export function AdminModForm({
  mod,
  initialValues,
  initialRestrictions = [],
  initialVersions = [],
}: AdminModFormProps) {
  const router = useRouter();
  const isEditing = Boolean(mod);

  // Form action binding
  const boundAction = isEditing ? updateMod.bind(null, mod!.id) : createMod;
  const [state, formAction, isPending] = useActionState(boundAction, initialResult);

  // Manual fallback toggle for new mod
  const [showManualOnly, setShowManualOnly] = useState(isEditing);

  // Form Field States
  const [name, setName] = useState(mod?.name || initialValues?.name || '');
  const [slug, setSlug] = useState(mod?.slug || initialValues?.slug || '');
  const [modId, setModId] = useState(mod?.mod_id || initialValues?.mod_id || '');
  const [source, setSource] = useState<ModSource>(
    (mod?.source as ModSource) || (initialValues?.source as ModSource) || 'manual'
  );
  const [sourceProjectId, setSourceProjectId] = useState(
    mod?.source_project_id || initialValues?.source_project_id || ''
  );
  const [iconUrl, setIconUrl] = useState(mod?.icon_url || initialValues?.icon_url || '');
  const [description, setDescription] = useState(
    mod?.description || initialValues?.description || ''
  );
  const [category, setCategory] = useState(
    mod?.category || initialValues?.category || 'Allgemein'
  );

  // HARD RULE: Default status is ALWAYS 'unknown' (ungeprüft), NEVER 'allowed'!
  const [status, setStatus] = useState<ModStatus>(
    mod?.status || initialValues?.status || 'unknown'
  );
  const [reason, setReason] = useState(mod?.reason || initialValues?.reason || '');

  // External Links
  const [modrinthUrl, setModrinthUrl] = useState(
    mod?.modrinth_url || initialValues?.modrinth_url || ''
  );
  const [curseforgeUrl, setCurseforgeUrl] = useState(
    mod?.curseforge_url || initialValues?.curseforge_url || ''
  );
  const [sourceUrl, setSourceUrl] = useState(
    mod?.source_url || initialValues?.source_url || ''
  );
  const [websiteUrl, setWebsiteUrl] = useState(
    mod?.website_url || initialValues?.website_url || ''
  );

  // Versions and Loaders
  const [mcVersions, setMcVersions] = useState(
    mod?.minecraft_versions?.join(', ') || initialValues?.minecraft_versions?.join(', ') || ''
  );
  const [selectedLoaders, setSelectedLoaders] = useState<string[]>(
    mod?.loaders || initialValues?.loaders || ['Fabric']
  );

  // Structured Restrictions
  const [restrictionsList, setRestrictionsList] = useState<StructuredRestrictionItem[]>(() => {
    if (initialRestrictions.length > 0) {
      return initialRestrictions.map((r) => ({
        id: r.id,
        title: r.title,
        description: r.description,
      }));
    }
    if (mod?.restrictions) {
      // Parse legacy plain text lines starting with bullet if available
      const lines = mod.restrictions.split('\n').filter(Boolean);
      return lines.map((l, idx) => {
        const cleaned = l.replace(/^[•\-\*]\s*/, '');
        const parts = cleaned.split(':');
        if (parts.length > 1) {
          return {
            id: `legacy-${idx}`,
            title: parts[0].trim(),
            description: parts.slice(1).join(':').trim(),
          };
        }
        return {
          id: `legacy-${idx}`,
          title: 'Auflage',
          description: cleaned.trim(),
        };
      });
    }
    return [];
  });

  // Version-specific evaluation config
  const [versionMode, setVersionMode] = useState<'all' | 'custom'>(
    initialVersions.length > 0 ? 'custom' : 'all'
  );
  const [versionsConfig, setVersionsConfig] = useState<ConfigurableVersionItem[]>(() => {
    if (initialVersions.length > 0) {
      return initialVersions.map((v) => ({
        id: v.id,
        mod_version: v.mod_version,
        minecraft_version: v.minecraft_version,
        loader: v.loader,
        status: (v.status as 'allowed' | 'restricted' | 'blocked' | 'unknown') || 'unknown',
        note: v.note || '',
        source_version_id: v.source_version_id || undefined,
        published_at: v.published_at || undefined,
        release_type: v.release_type || 'release',
        changelog: v.changelog || undefined,
        files_metadata: v.files_metadata || undefined,
      }));
    }
    return [];
  });

  // State for Changelog Modal
  const [activeChangelogVersion, setActiveChangelogVersion] = useState<ConfigurableVersionItem | null>(null);

  // Preview Mode
  const [showPreview, setShowPreview] = useState(false);

  const setAllVersionsStatus = (targetStatus: 'allowed' | 'restricted' | 'blocked' | 'unknown') => {
    setVersionsConfig((prev) => prev.map((v) => ({ ...v, status: targetStatus })));
  };

  // Handle successful import from ModImportSearch
  const handleImportSuccess = (imported: ImportedModData) => {
    setName(imported.name);
    setSlug(imported.slug);
    setModId(imported.mod_id);
    setDescription(imported.description);
    setCategory(imported.category);
    setIconUrl(imported.icon_url || '');
    setSource(imported.source);
    setSourceProjectId(imported.source_project_id);
    setModrinthUrl(imported.modrinth_url || '');
    setCurseforgeUrl(imported.curseforge_url || '');
    setSourceUrl(imported.source_url || '');
    setWebsiteUrl(imported.website_url || '');
    setMcVersions(imported.minecraft_versions.slice(0, 15).join(', '));
    setSelectedLoaders(imported.loaders);

    // Explicitly set status to unknown (never allowed automatically)
    setStatus('unknown');
    setReason('');
    setRestrictionsList([]);

    // Populate configurable versions from import with neutral 'unknown' status
    if (imported.versions && imported.versions.length > 0) {
      const mapped = imported.versions.slice(0, 35).map((v: ExternalModVersion) => ({
        id: v.id,
        mod_version: v.version_number,
        minecraft_version: v.game_versions?.[0] || '1.21.1',
        loader: (v.loaders?.[0] || 'Fabric').charAt(0).toUpperCase() + (v.loaders?.[0] || 'Fabric').slice(1),
        // HARD RULE: New external versions start as unknown/unreviewed
        status: 'unknown' as const,
        note: '',
        source_version_id: v.id,
        published_at: v.date_published,
        release_type: v.version_type || 'release',
        changelog: v.changelog || undefined,
        files_metadata: v.files || undefined,
      }));
      setVersionsConfig(mapped);
      setVersionMode('custom');
    }
  };

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newName = e.target.value;
    setName(newName);
    if (!isEditing && (!slug || slug === name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, ''))) {
      setSlug(
        newName
          .toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/(^-|-$)/g, '')
      );
    }
  };

  const toggleLoader = (loader: string) => {
    if (selectedLoaders.includes(loader)) {
      setSelectedLoaders(selectedLoaders.filter((l) => l !== loader));
    } else {
      setSelectedLoaders([...selectedLoaders, loader]);
    }
  };

  // Restrictions List Handlers
  const addRestriction = () => {
    setRestrictionsList((prev) => [
      ...prev,
      {
        id: `restr-${Date.now()}-${Math.random().toString(36).substring(2, 7)}`,
        title: '',
        description: '',
      },
    ]);
  };

  const updateRestriction = (id: string, field: 'title' | 'description', value: string) => {
    setRestrictionsList((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  const removeRestriction = (id: string) => {
    setRestrictionsList((prev) => prev.filter((item) => item.id !== id));
  };

  // Version Config Handlers
  const updateVersionItem = (
    id: string,
    field: 'status' | 'note',
    value: string
  ) => {
    setVersionsConfig((prev) =>
      prev.map((item) => (item.id === id ? { ...item, [field]: value } : item))
    );
  };

  if (state?.success) {
    router.push('/admin/mods');
    router.refresh();
  }

  return (
    <div className="space-y-6">
      {/* Top Bar / Navigation */}
      <div className="flex items-center justify-between">
        <Link
          href="/admin/mods"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Übersicht</span>
        </Link>

        <div className="flex items-center gap-2">
          {source !== 'manual' && (
            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded bg-[#101216] border border-[#232730] text-[11px] font-mono text-zinc-300">
              <span>Quelle:</span>
              <strong className="text-emerald-400 capitalize">{source}</strong>
              {sourceProjectId && <span className="text-zinc-500">({sourceProjectId})</span>}
            </span>
          )}
        </div>
      </div>

      {/* Automatic Mod Import Box (Only shown when creating new mod) */}
      {!isEditing && (
        <ModImportSearch
          onImportSuccess={handleImportSuccess}
          onManualToggle={setShowManualOnly}
          showManualOnly={showManualOnly}
        />
      )}

      {/* Server Action Error Banner */}
      {state?.error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <span className="font-semibold">{state.error}</span>
            {state.duplicate && state.existingModId && (
              <div>
                <Link
                  href={`/admin/mods/${state.existingModId}/edit`}
                  className="inline-flex items-center gap-1 underline text-rose-200 hover:text-white"
                >
                  <span>Vorhandenen Mod zur Bearbeitung öffnen</span>
                  <ExternalLink className="w-3 h-3" />
                </Link>
              </div>
            )}
          </div>
        </div>
      )}

      {/* PREVIEW VIEW (Vorschau vor dem Speichern) */}
      {showPreview ? (
        <div className="space-y-6">
          <div className="bg-[#14161b] border border-emerald-800/40 rounded-md p-6 space-y-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#20242e] pb-4">
              <div>
                <span className="text-[11px] font-mono uppercase tracking-wider text-emerald-400">
                  Vorschau vor dem Speichern
                </span>
                <h2 className="text-lg font-bold text-white">
                  So wird der Mod für Spieler auf Survivalecke dargestellt:
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 hover:text-white text-xs font-medium rounded transition-colors"
              >
                <Edit3 className="w-3.5 h-3.5" />
                <span>Zurück zum Bearbeiten</span>
              </button>
            </div>

            {/* Public Card Mockup */}
            <div className="bg-[#101216] border border-[#232730] rounded-lg p-6 space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                <div className="flex items-start gap-4">
                  {iconUrl ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={iconUrl}
                      alt={name}
                      className="w-14 h-14 rounded-lg bg-zinc-800 object-cover border border-[#232730] shrink-0"
                    />
                  ) : (
                    <div className="w-14 h-14 rounded-lg bg-zinc-800 border border-[#232730] flex items-center justify-center text-zinc-500 font-bold text-xl shrink-0">
                      {name.charAt(0) || 'M'}
                    </div>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono uppercase px-2 py-0.5 rounded bg-zinc-800 text-zinc-300">
                        {category}
                      </span>
                      {modId && (
                        <span className="text-[11px] font-mono text-zinc-400">
                          ID: {modId}
                        </span>
                      )}
                      {source !== 'manual' && (
                        <span className="text-[11px] font-mono px-1.5 py-0.5 rounded bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 capitalize">
                          {source}
                        </span>
                      )}
                    </div>
                    <h3 className="text-xl font-bold text-white">{name || 'Unbenannter Mod'}</h3>
                    <p className="text-xs text-zinc-400 font-mono">/{slug || 'slug'}</p>
                  </div>
                </div>

                <StatusBadge status={status} size="lg" />
              </div>

              {description && (
                <p className="text-xs sm:text-sm text-zinc-300 border-t border-[#1f232c] pt-3">
                  {description}
                </p>
              )}

              {/* Status Reason */}
              {reason && (
                <div className="bg-[#14161b] border border-[#232730] rounded p-4 space-y-1.5">
                  <div className="text-xs font-semibold text-zinc-300 uppercase tracking-wider flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-zinc-400" />
                    <span>Warum diese Einstufung?</span>
                  </div>
                  <p className="text-xs text-zinc-300 whitespace-pre-line leading-relaxed">
                    {reason}
                  </p>
                </div>
              )}

              {/* Restrictions */}
              {status === 'restricted' && restrictionsList.length > 0 && (
                <div className="bg-amber-950/20 border border-amber-800/40 rounded p-4 space-y-2.5">
                  <div className="text-xs font-semibold text-amber-400 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auflagen & Einschränkungen für Survivalecke</span>
                  </div>
                  <ul className="space-y-2">
                    {restrictionsList.map((r, i) => (
                      <li key={r.id || i} className="text-xs text-amber-200">
                        <strong className="text-amber-100 font-semibold">• {r.title}:</strong>{' '}
                        <span>{r.description}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Metadata Badges */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 pt-3 border-t border-[#1f232c] text-xs">
                <div>
                  <span className="text-[11px] text-zinc-500 block">Unterstützte Loader:</span>
                  <span className="text-zinc-200 font-medium">
                    {selectedLoaders.length > 0 ? selectedLoaders.join(', ') : '–'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Minecraft-Versionen:</span>
                  <span className="text-zinc-200 font-medium font-mono text-xs">
                    {mcVersions ? (
                      mcVersions.split(',').length > 4
                        ? `${mcVersions.split(',').slice(0, 3).map((v) => v.trim()).join(', ')} (+${mcVersions.split(',').length - 3} weitere)`
                        : mcVersions
                    ) : '–'}
                  </span>
                </div>
                <div>
                  <span className="text-[11px] text-zinc-500 block">Geprüfte Versionen:</span>
                  <span className="text-zinc-200 font-medium">
                    {versionMode === 'custom' && versionsConfig.length > 0
                      ? `${versionsConfig.length} konfigurierte Versionen`
                      : 'Gilt für alle Versionen'}
                  </span>
                </div>
              </div>
            </div>

            {/* Confirmation & Final Submit Bar */}
            <div className="flex items-center justify-between pt-3 border-t border-[#20242e]">
              <button
                type="button"
                onClick={() => setShowPreview(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
              >
                Zurück zum Bearbeiten
              </button>

              <button
                type="button"
                disabled={isPending}
                onClick={() => {
                  const form = document.getElementById('admin-mod-form') as HTMLFormElement;
                  if (form) form.requestSubmit();
                }}
                className="inline-flex items-center gap-1.5 px-6 py-2.5 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors shadow-lg cursor-pointer"
              >
                {isPending ? (
                  <>
                    <Loader2 className="w-4 h-4 animate-spin" />
                    <span>Wird gespeichert...</span>
                  </>
                ) : (
                  <>
                    <Save className="w-4 h-4" />
                    <span>{isEditing ? 'Änderungen endgültig speichern' : 'Mod endgültig hinzufügen'}</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {/* MAIN FORM */}
      <form
        id="admin-mod-form"
        action={formAction}
        className={`space-y-6 ${showPreview ? 'hidden' : ''}`}
      >
        {/* Hidden inputs for serialized metadata */}
        <input type="hidden" name="source" value={source} />
        <input type="hidden" name="source_project_id" value={sourceProjectId} />
        <input type="hidden" name="icon_url" value={iconUrl} />
        <input
          type="hidden"
          name="restrictions_json"
          value={JSON.stringify(
            restrictionsList.filter((r) => r.title.trim() && r.description.trim())
          )}
        />
        <input
          type="hidden"
          name="versions_json"
          value={versionMode === 'custom' ? JSON.stringify(versionsConfig) : '[]'}
        />

        {/* Section: Grunddaten */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-5">
          <div className="flex items-center justify-between border-b border-[#20242e] pb-2">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Grunddaten
            </h3>
            {iconUrl && (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={iconUrl}
                alt="Logo"
                className="w-8 h-8 rounded border border-zinc-700 object-cover"
                title="Mod-Icon"
              />
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="name" className="block text-xs font-semibold text-zinc-200">
                Modname <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                id="name"
                name="name"
                required
                value={name}
                onChange={handleNameChange}
                placeholder="z. B. Sodium"
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
              />
              {state?.fieldErrors?.name && (
                <p className="text-[11px] text-rose-400">{state.fieldErrors.name[0]}</p>
              )}
            </div>

            <div className="space-y-1.5">
              <label htmlFor="slug" className="block text-xs font-semibold text-zinc-200">
                Slug (URL-Pfad) <span className="text-rose-400">*</span>
              </label>
              <input
                type="text"
                id="slug"
                name="slug"
                required
                value={slug}
                onChange={(e) => setSlug(e.target.value)}
                placeholder="z. B. sodium"
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 font-mono rounded py-2 px-3 text-xs"
              />
              {state?.fieldErrors?.slug && (
                <p className="text-[11px] text-rose-400">{state.fieldErrors.slug[0]}</p>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="mod_id" className="block text-xs font-semibold text-zinc-200">
                Mod-ID (Fabric/Forge)
              </label>
              <input
                type="text"
                id="mod_id"
                name="mod_id"
                value={modId}
                onChange={(e) => setModId(e.target.value)}
                placeholder="z. B. sodium"
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 font-mono rounded py-2 px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="category" className="block text-xs font-semibold text-zinc-200">
                Kategorie <span className="text-rose-400">*</span>
              </label>
              <select
                id="category"
                name="category"
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
              >
                <option value="Performance">Performance</option>
                <option value="Visual">Optik & Shader / Visual</option>
                <option value="HUD">HUD & UI</option>
                <option value="Audio">Audio & Sound</option>
                <option value="Utility">Utility / Werkzeuge</option>
                <option value="Map">Minimap / Map</option>
                <option value="Chat">Chat & Social</option>
                <option value="Allgemein">Allgemein / Other</option>
              </select>
            </div>

            <div className="space-y-1.5">
              <label htmlFor="minecraft_versions" className="block text-xs font-semibold text-zinc-200">
                Minecraft-Versionen (Kommagetrennt)
              </label>
              <input
                type="text"
                id="minecraft_versions"
                name="minecraft_versions"
                value={mcVersions}
                onChange={(e) => setMcVersions(e.target.value)}
                placeholder="z. B. 1.21.1, 1.21, 1.20.4"
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
              />
            </div>
          </div>

          {/* Loaders Checkboxes */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-200">
              Unterstützte Loader
            </label>
            <div className="flex flex-wrap gap-4 text-xs">
              {['Fabric', 'Forge', 'NeoForge', 'Quilt'].map((loader) => (
                <label key={loader} className="inline-flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    name="loaders"
                    value={loader}
                    checked={selectedLoaders.includes(loader)}
                    onChange={() => toggleLoader(loader)}
                    className="rounded border-[#262b35] bg-[#101216] text-emerald-500 focus:ring-0 cursor-pointer"
                  />
                  <span className="text-zinc-300">{loader}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Description */}
          <div className="space-y-1.5">
            <label htmlFor="description" className="block text-xs font-semibold text-zinc-200">
              Beschreibung
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Kurze Zusammenfassung der Mod-Funktion..."
              className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
            />
          </div>
        </div>

        {/* Section: Survivalecke Bewertung */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-5">
          <div className="border-b border-[#20242e] pb-2 flex items-center justify-between">
            <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider">
              Survivalecke Bewertung
            </h3>
            <span className="text-[11px] text-zinc-400">
              Einstufung für das Regelwerk
            </span>
          </div>

          {/* Status Selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-zinc-200">
              Status auf Survivalecke <span className="text-rose-400">*</span>
            </label>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { val: 'allowed', label: '🟢 ERLAUBT', border: 'border-emerald-800' },
                { val: 'restricted', label: '🟡 EINGESCHRÄNKT', border: 'border-amber-800' },
                { val: 'blocked', label: '🔴 VERBOTEN', border: 'border-rose-800' },
                { val: 'unknown', label: '⚪ UNGEPRÜFT', border: 'border-zinc-700' },
              ].map((item) => (
                <label
                  key={item.val}
                  className={`p-3 rounded border text-xs font-medium cursor-pointer flex items-center gap-2 transition-colors ${
                    status === item.val
                      ? `bg-[#181b22] text-white ${item.border}`
                      : 'bg-[#101216] text-zinc-400 border-[#232730] hover:text-zinc-200'
                  }`}
                >
                  <input
                    type="radio"
                    name="status"
                    value={item.val}
                    checked={status === item.val}
                    onChange={() => setStatus(item.val as ModStatus)}
                    className="sr-only"
                  />
                  <span>{item.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Reason */}
          <div className="space-y-1.5">
            <label htmlFor="reason" className="block text-xs font-semibold text-zinc-200">
              Begründung der Einstufung{' '}
              {(status === 'restricted' || status === 'blocked') && (
                <span className="text-rose-400 font-bold">* (Pflichtfeld bei Eingeschränkt/Verboten)</span>
              )}
            </label>
            <textarea
              id="reason"
              name="reason"
              rows={3}
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder={
                status === 'blocked'
                  ? 'Erkläre, warum der Mod unfairen Vorteil bietet oder gegen Serverregeln verstößt...'
                  : status === 'restricted'
                  ? 'Erkläre, unter welchen Bedingungen und warum dieser Mod eingeschränkt ist...'
                  : 'Begründung oder Notiz für Spieler und Serverteam...'
              }
              className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
            />
            {state?.fieldErrors?.reason && (
              <p className="text-[11px] text-rose-400">{state.fieldErrors.reason[0]}</p>
            )}
          </div>

          {/* Structured Restrictions (When status is restricted) */}
          {status === 'restricted' && (
            <div className="p-4 bg-amber-950/15 border border-amber-800/40 rounded-md space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h4 className="text-xs font-semibold text-amber-300 uppercase tracking-wider flex items-center gap-1.5">
                    <ShieldAlert className="w-3.5 h-3.5 text-amber-400" />
                    <span>Auflagen & Einschränkungen (Strukturiert)</span>
                  </h4>
                  <p className="text-[11px] text-zinc-400 mt-0.5">
                    Definiere erlaubte und verbotene Funktionen für Spieler als Aufzählungspunkte.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={addRestriction}
                  className="inline-flex items-center gap-1 px-2.5 py-1 bg-amber-900/40 hover:bg-amber-800/50 border border-amber-700/60 text-amber-200 text-xs font-medium rounded transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Einschränkung hinzufügen</span>
                </button>
              </div>

              {restrictionsList.length === 0 ? (
                <div className="p-3 bg-[#101216] border border-[#262b35] rounded text-center text-xs text-zinc-400">
                  Keine Einschränkungen definiert. Klicke auf &bdquo;Einschränkung hinzufügen&ldquo;, um Auflagen festzulegen.
                </div>
              ) : (
                <div className="space-y-3">
                  {restrictionsList.map((item, index) => (
                    <div
                      key={item.id}
                      className="p-3 bg-[#101216] border border-amber-900/30 rounded flex flex-col sm:flex-row gap-2 items-start"
                    >
                      <div className="flex-1 w-full space-y-2">
                        <input
                          type="text"
                          value={item.title}
                          onChange={(e) => updateRestriction(item.id, 'title', e.target.value)}
                          placeholder={`Titel ${index + 1} (z. B. Cave-Maps deaktivieren)`}
                          className="w-full bg-[#14161b] border border-[#2b303d] focus:border-amber-600 focus:outline-none text-zinc-100 rounded py-1.5 px-2.5 text-xs font-semibold"
                        />
                        <textarea
                          rows={2}
                          value={item.description}
                          onChange={(e) => updateRestriction(item.id, 'description', e.target.value)}
                          placeholder="Genaue Anweisung (z. B. Höhlenansicht und Entity-Radar müssen in den Einstellungen ausgeschaltet sein)."
                          className="w-full bg-[#14161b] border border-[#2b303d] focus:border-amber-600 focus:outline-none text-zinc-200 rounded py-1.5 px-2.5 text-xs"
                        />
                      </div>
                      <button
                        type="button"
                        onClick={() => removeRestriction(item.id)}
                        className="p-1.5 text-zinc-400 hover:text-rose-400 transition-colors shrink-0"
                        title="Eintrag entfernen"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Version-Specific Evaluation Switch */}
          <div className="space-y-3 border-t border-[#20242e] pt-4">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-xs font-semibold text-zinc-200">
                  Gültigkeit für Versionen
                </h4>
                <p className="text-[11px] text-zinc-400">
                  Lege fest, ob die Bewertung für alle Versionen gilt oder Versionen einzeln geprüft wurden.
                </p>
              </div>

              <div className="flex items-center gap-2">
                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    name="version_mode_choice"
                    value="all"
                    checked={versionMode === 'all'}
                    onChange={() => setVersionMode('all')}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>Für alle Versionen</span>
                </label>

                <label className="inline-flex items-center gap-1.5 text-xs text-zinc-300 cursor-pointer">
                  <input
                    type="radio"
                    name="version_mode_choice"
                    value="custom"
                    checked={versionMode === 'custom'}
                    onChange={() => setVersionMode('custom')}
                    className="text-emerald-500 focus:ring-0"
                  />
                  <span>Versionen individuell</span>
                </label>
              </div>
            </div>

            {/* Version Config Table */}
            {versionMode === 'custom' && (
              <div className="space-y-2 border border-[#262b35] rounded bg-[#101216] p-3">
                {/* Bulk Actions Header */}
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#20242e] pb-2">
                  <span className="text-[11px] font-semibold text-zinc-300">
                    Modrinth-Versionen ({versionsConfig.length})
                  </span>
                  <div className="flex items-center gap-1.5 text-[10px]">
                    <span className="text-zinc-500">Schnellauswahl:</span>
                    <button
                      type="button"
                      onClick={() => setAllVersionsStatus('allowed')}
                      className="px-2 py-0.5 rounded bg-emerald-950/60 hover:bg-emerald-900 border border-emerald-800/80 text-emerald-300 transition-colors cursor-pointer"
                    >
                      Alle auf Erlaubt
                    </button>
                    <button
                      type="button"
                      onClick={() => setAllVersionsStatus('unknown')}
                      className="px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-zinc-300 transition-colors cursor-pointer"
                    >
                      Alle auf Ungeprüft
                    </button>
                  </div>
                </div>

                {versionsConfig.length === 0 ? (
                  <div className="p-4 text-xs text-zinc-400 text-center">
                    Keine importierten Versionen vorhanden. Trage Versionen manuell ein oder nutze die automatische Mod-Suche.
                  </div>
                ) : (
                  <div className="max-h-72 overflow-y-auto">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead className="bg-[#0e1014] sticky top-0 border-b border-[#262b35] text-[11px] text-zinc-400 font-semibold">
                        <tr>
                          <th className="py-2 px-3">Version</th>
                          <th className="py-2 px-3">MC</th>
                          <th className="py-2 px-3">Loader</th>
                          <th className="py-2 px-3">Typ</th>
                          <th className="py-2 px-3">Survivalecke Status</th>
                          <th className="py-2 px-3 text-center">Changelog & KI</th>
                          <th className="py-2 px-3">Hinweis</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-[#1e222a]">
                        {versionsConfig.map((ver) => {
                          const isRelease = ver.release_type === 'release';
                          const isBeta = ver.release_type === 'beta';

                          return (
                            <tr key={ver.id} className="hover:bg-[#181b22] transition-colors">
                              <td className="py-2 px-3 font-mono font-medium text-zinc-200">
                                {ver.mod_version}
                              </td>
                              <td className="py-2 px-3 text-zinc-300 font-mono text-[11px]">
                                {ver.minecraft_version}
                              </td>
                              <td className="py-2 px-3 text-zinc-300">{ver.loader}</td>
                              <td className="py-2 px-3">
                                <span
                                  className={`text-[9px] font-mono uppercase px-1.5 py-0.2 rounded border ${
                                    isRelease
                                      ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                                      : isBeta
                                      ? 'bg-blue-950/40 border-blue-800/60 text-blue-300'
                                      : 'bg-amber-950/40 border-amber-800/60 text-amber-300'
                                  }`}
                                >
                                  {ver.release_type || 'release'}
                                </span>
                              </td>
                              <td className="py-2 px-3">
                                <select
                                  value={ver.status}
                                  onChange={(e) =>
                                    updateVersionItem(
                                      ver.id,
                                      'status',
                                      e.target.value as 'allowed' | 'restricted' | 'blocked' | 'unknown'
                                    )
                                  }
                                  className={`bg-[#14161b] border rounded text-[11px] py-1 px-2 font-medium cursor-pointer ${
                                    ver.status === 'allowed'
                                      ? 'border-emerald-800/80 text-emerald-300'
                                      : ver.status === 'restricted'
                                      ? 'border-amber-800/80 text-amber-300'
                                      : ver.status === 'blocked'
                                      ? 'border-rose-800/80 text-rose-300'
                                      : 'border-zinc-700 text-zinc-400'
                                  }`}
                                >
                                  <option value="unknown">⚪ Ungeprüft</option>
                                  <option value="allowed">🟢 Erlaubt</option>
                                  <option value="restricted">🟡 Eingeschränkt</option>
                                  <option value="blocked">🔴 Verboten</option>
                                </select>
                              </td>
                              <td className="py-2 px-3 text-center">
                                <button
                                  type="button"
                                  onClick={() => setActiveChangelogVersion(ver)}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-[10px] text-zinc-300 hover:text-white transition-colors cursor-pointer"
                                  title="Changelog einsehen und KI-Sicherheitsanalyse starten"
                                >
                                  <FileText className="w-3 h-3 text-emerald-400" />
                                  <span>Changelog</span>
                                </button>
                              </td>
                              <td className="py-2 px-3">
                                <input
                                  type="text"
                                  value={ver.note}
                                  onChange={(e) =>
                                    updateVersionItem(ver.id, 'note', e.target.value)
                                  }
                                  placeholder="Notiz..."
                                  className="w-full bg-[#14161b] border border-[#2b303d] rounded text-[11px] py-1 px-2 text-zinc-200"
                                />
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Section: Externe Links & IDs */}
        <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-4">
          <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-[#20242e] pb-2">
            Externe Links & IDs (Optional, nur https://)
          </h3>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label htmlFor="modrinth_url" className="block text-xs font-semibold text-zinc-200">
                Modrinth URL
              </label>
              <input
                type="url"
                id="modrinth_url"
                name="modrinth_url"
                value={modrinthUrl}
                onChange={(e) => setModrinthUrl(e.target.value)}
                placeholder="https://modrinth.com/mod/..."
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 font-mono rounded py-2 px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="curseforge_url" className="block text-xs font-semibold text-zinc-200">
                CurseForge URL
              </label>
              <input
                type="url"
                id="curseforge_url"
                name="curseforge_url"
                value={curseforgeUrl}
                onChange={(e) => setCurseforgeUrl(e.target.value)}
                placeholder="https://www.curseforge.com/minecraft/mc-mods/..."
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 font-mono rounded py-2 px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="source_url" className="block text-xs font-semibold text-zinc-200">
                Quellcode URL (GitHub / GitLab)
              </label>
              <input
                type="url"
                id="source_url"
                name="source_url"
                value={sourceUrl}
                onChange={(e) => setSourceUrl(e.target.value)}
                placeholder="https://github.com/..."
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 font-mono rounded py-2 px-3 text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="website_url" className="block text-xs font-semibold text-zinc-200">
                Offizielle Website
              </label>
              <input
                type="url"
                id="website_url"
                name="website_url"
                value={websiteUrl}
                onChange={(e) => setWebsiteUrl(e.target.value)}
                placeholder="https://..."
                className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 font-mono rounded py-2 px-3 text-xs"
              />
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3 pt-2">
          <Link
            href="/admin/mods"
            className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors w-full sm:w-auto text-center"
          >
            Abbrechen
          </Link>

          <div className="flex items-center gap-3 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={() => setShowPreview(true)}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-200 hover:text-white text-xs font-medium rounded border border-zinc-700 transition-colors cursor-pointer"
            >
              <Eye className="w-3.5 h-3.5 text-zinc-400" />
              <span>Vorschau vor dem Speichern</span>
            </button>

            <button
              type="submit"
              disabled={isPending}
              className="inline-flex items-center justify-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors cursor-pointer"
            >
              {isPending ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  <span>Wird gespeichert...</span>
                </>
              ) : (
                <>
                  <Save className="w-3.5 h-3.5" />
                  <span>{isEditing ? 'Änderungen speichern' : 'Mod hinzufügen'}</span>
                </>
              )}
            </button>
          </div>
        </div>
      </form>

      {/* Changelog Modal */}
      {activeChangelogVersion && (
        <VersionChangelogModal
          isOpen={Boolean(activeChangelogVersion)}
          onClose={() => setActiveChangelogVersion(null)}
          modName={name || 'Mod'}
          versionNumber={activeChangelogVersion.mod_version}
          releaseType={activeChangelogVersion.release_type}
          publishedAt={activeChangelogVersion.published_at}
          changelog={activeChangelogVersion.changelog}
        />
      )}
    </div>
  );
}
