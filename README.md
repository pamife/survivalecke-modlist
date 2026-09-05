# Survivalecke – Client-Mod-Datenbank

Offizielle Client-Mod-Datenbank für den Minecraft-Server **Survivalecke**.

Diese Plattform ermöglicht es Spielern von Survivalecke, schnell und verlässlich nachzuschlagen, ob ein bestimmter Client-Mod auf dem Server erlaubt, eingeschränkt, verboten oder noch nicht geprüft ist.

---

## Status-Definitionen

- 🟢 **ERLAUBT** (`allowed`): Der Mod ist für das Spielen auf Survivalecke freigegeben.
- 🟡 **EINGESCHRÄNKT** (`restricted`): Der Mod darf nur unter bestimmten Auflagen genutzt werden (z. B. Deaktivierung einzelner unzulässiger Features).
- 🔴 **VERBOTEN** (`blocked`): Der Mod verschafft unfaire Spielvorteile oder verstößt gegen die Serverregeln und ist untersagt.
- ⚪ **NOCH NICHT GEPRÜFT** (`unknown`): Der Mod wurde vom Survivalecke-Team noch nicht evaluiert. Spieler können einen Prüfungsantrag einreichen.

---

## Tech Stack

- **Framework**: [Next.js](https://nextjs.org/) (App Router, React 19, TypeScript)
- **Styling**: [Tailwind CSS](https://tailwindcss.com/)
- **Backend & Auth**: [Supabase](https://supabase.com/) (PostgreSQL mit Row Level Security)
- **Icons**: [Lucide React](https://lucide.dev/)
- **Validierung**: [Zod](https://zod.dev/)
- **Hosting**: [Vercel](https://vercel.com/)
- **Repository-Verwaltung**: GitHub CLI (`gh`)

---

## Sicherheitsarchitektur

- **Strikte Row Level Security (RLS)**: Öffentlich lesbar sind ausschließlich freigegebene Mods und Prüfberichte. Administrative Tabellen (`audit_logs`, unveröffentlichte Metadaten) sind per RLS für Unbefugte unzugänglich.
- **Serverseitige Autorisierung**: Die Admin-Rolle wird aus der Tabelle `profiles` serverseitig in Server Components und Server Actions verifiziert. Keine Client-Vertrauensstellung.
- **Input-Sanitization & URL-Sicherheit**: Externe Links werden strikt auf `https://` validiert. Es wird kein unvalidiertes HTML gerendert.
- **Null Demo-Daten**: Die Datenbank startet komplett leer. Es existieren keinerlei Fake-Mods, Fake-Statistiken oder Seed-Daten im Code.

---

## Lokale Entwicklung

### Voraussetzungen

- Node.js >= 20.x
- npm oder kompatibler Paketmanager
- Ein Supabase-Projekt

### Installation

```bash
# Repository klonen
git clone https://github.com/pamife/survivalecke-modlist.git
cd survivalecke-modlist

# Abhängigkeiten installieren
npm install
```

### Umgebungsvariablen konfigurieren

Erstelle eine Datei `.env.local` auf Basis der Vorlage `.env.example`:

```bash
cp .env.example .env.local
```

Trage dort deine Supabase-Zugangsdaten ein:

```env
NEXT_PUBLIC_SUPABASE_URL=https://<dein-projekt>.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=<dein-anon-key>
```

> **Wichtig:** Echte Zugangsdaten und API-Keys dürfen **niemals** in das Git-Repository eingecheckt werden. `.env.local` wird per `.gitignore` ignoriert.

### Datenbank-Setup & Migrationen

Die SQL-Migrationen befinden sich im Ordner `supabase/migrations/`:

Führe die Migrationen im Supabase SQL Editor aus oder nutze die Supabase CLI:

```bash
# Schema und RLS-Richtlinien anwenden:
supabase/migrations/20260905_init_schema.sql
```

### Entwicklungsserver starten

```bash
npm run dev
```

Die Anwendung ist anschließend unter `http://localhost:3000` erreichbar.

### Production Build testen

```bash
npm run build
npm run start
```

---

## Vercel Deployment

1. Repository auf GitHub pushen.
2. In Vercel ein neues Projekt importieren und das Repository `survivalecke-modlist` auswählen.
3. In den Vercel-Projekteinstellungen unter **Environment Variables** folgende Variablen hinterlegen:
   - `NEXT_PUBLIC_SUPABASE_URL`
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`
4. Deploy ausführen.

---

## Lizenz

Entwickelt für die Community von **Survivalecke**.
