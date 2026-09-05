'use client';

import React, { useState, useActionState } from 'react';
import { createMod, updateMod, type ModActionResult } from '@/actions/adminMods';
import { useRouter } from 'next/navigation';
import { Save, Loader2, AlertCircle, ArrowLeft, Download } from 'lucide-react';
import Link from 'next/link';
import type { Mod, ModStatus } from '@/types/database';

interface AdminModFormProps {
  mod?: Mod;
  initialValues?: Partial<Mod>;
}

const initialResult: ModActionResult = {};

export function AdminModForm({ mod, initialValues }: AdminModFormProps) {
  const router = useRouter();
  const isEditing = Boolean(mod);

  // Form action binding
  const boundAction = isEditing
    ? updateMod.bind(null, mod!.id)
    : createMod;

  const [state, formAction, isPending] = useActionState(boundAction, initialResult);

  // Local state for fields that might be modified by autocomplete
  const [name, setName] = useState(mod?.name || initialValues?.name || '');
  const [slug, setSlug] = useState(mod?.slug || initialValues?.slug || '');
  const [modId, setModId] = useState(mod?.mod_id || initialValues?.mod_id || '');
  const [description, setDescription] = useState(mod?.description || initialValues?.description || '');
  const [category, setCategory] = useState(mod?.category || initialValues?.category || 'Allgemein');
  const [status, setStatus] = useState<ModStatus>(mod?.status || initialValues?.status || 'allowed');
  const [reason, setReason] = useState(mod?.reason || initialValues?.reason || '');
  const [restrictions, setRestrictions] = useState(mod?.restrictions || initialValues?.restrictions || '');
  const [modrinthUrl, setModrinthUrl] = useState(mod?.modrinth_url || initialValues?.modrinth_url || '');
  const [curseforgeUrl, setCurseforgeUrl] = useState(mod?.curseforge_url || initialValues?.curseforge_url || '');
  const [sourceUrl, setSourceUrl] = useState(mod?.source_url || initialValues?.source_url || '');
  const [websiteUrl, setWebsiteUrl] = useState(mod?.website_url || initialValues?.website_url || '');
  const [mcVersions, setMcVersions] = useState(
    mod?.minecraft_versions?.join(', ') || initialValues?.minecraft_versions?.join(', ') || ''
  );
  const [selectedLoaders, setSelectedLoaders] = useState<string[]>(
    mod?.loaders || initialValues?.loaders || ['Fabric']
  );

  const [isFetchingModrinth, setIsFetchingModrinth] = useState(false);
  const [modrinthFetchError, setModrinthFetchError] = useState<string | null>(null);

  // Auto-generate slug from name if not manually edited
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

  // Optional Modrinth Metadata Fetcher (Safe public API, strictly for metadata pre-filling)
  const fetchModrinthData = async () => {
    if (!modrinthUrl && !name) {
      setModrinthFetchError('Bitte zuerst Modrinth-URL oder Name eingeben.');
      return;
    }

    setIsFetchingModrinth(true);
    setModrinthFetchError(null);

    try {
      let slugOrId = '';
      if (modrinthUrl) {
        const match = modrinthUrl.match(/modrinth\.com\/mod\/([^/?#]+)/i);
        if (match) slugOrId = match[1];
      }
      if (!slugOrId) {
        slugOrId = name.trim().toLowerCase().replace(/\s+/g, '-');
      }

      const res = await fetch(`https://api.modrinth.com/v2/project/${encodeURIComponent(slugOrId)}`, {
        headers: {
          'User-Agent': 'Survivalecke-Modlist/1.0 (info@survivalecke.de)',
        },
      });

      if (!res.ok) {
        throw new Error('Modrinth-Projekt nicht gefunden.');
      }

      const data = await res.json();
      if (data.title && !name) setName(data.title);
      if (data.description && !description) setDescription(data.description);
      if (data.slug && !slug) setSlug(data.slug);
      if (data.slug && !modId) setModId(data.slug);
      if (data.source_url && !sourceUrl) setSourceUrl(data.source_url);
      if (data.issues_url && !websiteUrl) setWebsiteUrl(data.issues_url);
      if (data.loaders && Array.isArray(data.loaders)) {
        const capitalizedLoaders = data.loaders.map(
          (l: string) => l.charAt(0).toUpperCase() + l.slice(1)
        );
        setSelectedLoaders(Array.from(new Set([...selectedLoaders, ...capitalizedLoaders])));
      }
      if (data.game_versions && Array.isArray(data.game_versions)) {
        const latestVersions = data.game_versions.slice(-5).reverse().join(', ');
        if (!mcVersions) setMcVersions(latestVersions);
      }
      if (!modrinthUrl) {
        setModrinthUrl(`https://modrinth.com/mod/${data.slug}`);
      }
    } catch (err: unknown) {
      setModrinthFetchError(err instanceof Error ? err.message : 'Fehler beim Abruf von Modrinth');
    } finally {
      setIsFetchingModrinth(false);
    }
  };

  if (state?.success) {
    router.push('/admin/mods');
    router.refresh();
  }

  return (
    <form action={formAction} className="space-y-6">
      <div className="flex items-center justify-between">
        <Link
          href="/admin/mods"
          className="inline-flex items-center gap-1 text-xs text-zinc-400 hover:text-zinc-200"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Zurück zur Übersicht</span>
        </Link>

        <button
          type="button"
          onClick={fetchModrinthData}
          disabled={isFetchingModrinth}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded bg-zinc-800 hover:bg-zinc-700 border border-zinc-700 text-xs text-zinc-300 hover:text-white transition-colors"
          title="Metadaten (Name, Beschreibung, Loader) von Modrinth abrufen"
        >
          {isFetchingModrinth ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin text-zinc-400" />
          ) : (
            <Download className="w-3.5 h-3.5 text-zinc-400" />
          )}
          <span>Modrinth-Metadaten abrufen</span>
        </button>
      </div>

      {modrinthFetchError && (
        <div className="p-2.5 bg-amber-950/40 border border-amber-800/60 rounded text-xs text-amber-300">
          Modrinth-Hinweis: {modrinthFetchError}
        </div>
      )}

      {state?.error && (
        <div className="p-3 bg-rose-950/40 border border-rose-800/60 rounded text-xs text-rose-300 flex items-start gap-2">
          <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
          <span>{state.error}</span>
        </div>
      )}

      <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-[#20242e] pb-2">
          Grunddaten
        </h3>

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
              <option value="Optik & Shader">Optik & Shader</option>
              <option value="HUD & UI">HUD & UI</option>
              <option value="Audio & Sound">Audio & Sound</option>
              <option value="Utility / Werkzeuge">Utility / Werkzeuge</option>
              <option value="Chat & Social">Chat & Social</option>
              <option value="Allgemein">Allgemein</option>
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
                  className="rounded border-[#262b35] bg-[#101216] text-emerald-500 focus:ring-0"
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

      {/* Survivalecke Evaluation & Status */}
      <div className="bg-[#14161b] border border-[#232730] rounded-md p-6 space-y-5">
        <h3 className="text-sm font-semibold text-zinc-200 uppercase tracking-wider border-b border-[#20242e] pb-2">
          Survivalecke Bewertung
        </h3>

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
            Begründung der Einstufung (Warum erlaubt / verboten?)
          </label>
          <textarea
            id="reason"
            name="reason"
            rows={3}
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Erkläre für Spieler nachvollziehbar, weshalb der Mod diesen Status hat..."
            className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
          />
        </div>

        {/* Restrictions */}
        <div className="space-y-1.5">
          <label htmlFor="restrictions" className="block text-xs font-semibold text-amber-400">
            Auflagen & Einschränkungen (nur bei EINGESCHRÄNKT)
          </label>
          <textarea
            id="restrictions"
            name="restrictions"
            rows={2}
            value={restrictions}
            onChange={(e) => setRestrictions(e.target.value)}
            placeholder="z. B. Cave-Maps, Entity-Radar und Schienen-Tracing müssen in den Mod-Einstellungen deaktiviert sein."
            className="w-full bg-[#101216] border border-[#262b35] focus:border-zinc-500 focus:outline-none text-zinc-200 rounded py-2 px-3 text-xs"
          />
        </div>
      </div>

      {/* External Links */}
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

      <div className="flex items-center justify-end gap-3 pt-2">
        <Link
          href="/admin/mods"
          className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-zinc-300 text-xs font-medium rounded transition-colors"
        >
          Abbrechen
        </Link>

        <button
          type="submit"
          disabled={isPending}
          className="inline-flex items-center gap-1.5 px-5 py-2 bg-emerald-600 hover:bg-emerald-500 disabled:bg-zinc-800 disabled:text-zinc-600 text-white text-xs font-semibold rounded transition-colors"
        >
          {isPending ? (
            <>
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>Wird gespeichert...</span>
            </>
          ) : (
            <>
              <Save className="w-3.5 h-3.5" />
              <span>{isEditing ? 'Änderungen speichern' : 'Mod anlegen'}</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
}
