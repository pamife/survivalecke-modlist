/**
 * AI-assisted Mod & Changelog Analysis for Survivalecke.
 *
 * Scans mod descriptions, changelogs, and features to detect potential
 * unfair advantages (X-Ray, Freecam, Auto-Clicker, Baritone, Entity Radar)
 * vs harmless quality-of-life or performance optimizations.
 *
 * Core Rule: Recommends only. Admin review and confirmation is ALWAYS required.
 */

export interface AnalysisRecommendation {
  modName: string;
  versionNumber?: string;
  riskLevel: 'low' | 'medium' | 'high';
  summary: string;
  detectedFeatures: string[];
  recommendedStatus: 'allowed' | 'restricted' | 'blocked';
  suggestedRestrictions: Array<{
    title: string;
    description: string;
  }>;
  confidence: number; // 0-100
  reasoning: string;
  sourceType: 'gemini_ai' | 'heuristic_engine';
}

const CRITICAL_KEYWORDS: Record<string, { title: string; desc: string; risk: 'high' | 'medium' }> = {
  xray: { title: 'X-Ray / Erzerkennung', desc: 'Erkennung oder Hervorhebung von Erzen durch Blöcke', risk: 'high' },
  'x-ray': { title: 'X-Ray / Erzerkennung', desc: 'Erkennung oder Hervorhebung von Erzen durch Blöcke', risk: 'high' },
  freecam: { title: 'Freecam / Entkoppelte Kamera', desc: 'Kamera darf nicht durch Blöcke fliegen oder ungesehene Bereiche aufdecken', risk: 'medium' },
  'auto-clicker': { title: 'Autoklicker / CPS-Mod', desc: 'Automatische Klicks oder Makros sind verboten', risk: 'high' },
  autoclicker: { title: 'Autoklicker / CPS-Mod', desc: 'Automatische Klicks oder Makros sind verboten', risk: 'high' },
  killaura: { title: 'Killaura / Auto-Attack', desc: 'Automatisches Angreifen von Spielern oder Mobs', risk: 'high' },
  aimbot: { title: 'Aimbot / Fadenkreuz-Hilfen', desc: 'Automatisches Zielen auf Entitäten', risk: 'high' },
  baritone: { title: 'Baritone / Pfadfinder-Bot', desc: 'Vollautomatisches Laufen und Abbauen', risk: 'high' },
  'auto-fish': { title: 'Auto-Angeln', desc: 'Vollautomatische Angel-Makros', risk: 'high' },
  autofish: { title: 'Auto-Angeln', desc: 'Vollautomatische Angel-Makros', risk: 'high' },
  radar: { title: 'Spieler- oder Mob-Radar', desc: 'Orten von Entitäten außerhalb des Sichtfelds', risk: 'high' },
  cavefinder: { title: 'Höhlenfinder / Höhlensicht', desc: 'Sichtbarmachen verdeckter Höhlen', risk: 'high' },
  speedhack: { title: 'Bewegungs-Exploit', desc: 'Erhöhte Lauf- oder Fluggeschwindigkeit', risk: 'high' },
  flyhack: { title: 'Unerlaubtes Fliegen', desc: 'Fliegen ohne Spielrechte im Survival', risk: 'high' },
  timer: { title: 'Spiel-Geschwindigkeits-Manipulation', desc: 'Veränderung der internen Spiel-Tickrate', risk: 'high' },
  schematic: { title: 'Schematica / Litematica Printer', desc: 'Easy-Place oder automatisches Bauen prüfen', risk: 'medium' },
  'easy-place': { title: 'Easy-Place / Drucker-Funktion', desc: 'Automatisches Platzieren von Blöcken muss deaktiviert sein', risk: 'medium' },
  printer: { title: 'Printer-Funktion', desc: 'Automatisches Setzen von Blöcken ist auf Survivalecke unzulässig', risk: 'medium' },
  fastbreak: { title: 'Fast-Break', desc: 'Unnatürlich schnelles Abbauen von Blöcken', risk: 'high' },
  fastplace: { title: 'Fast-Place', desc: 'Unnatürlich schnelles Setzen von Blöcken', risk: 'medium' },
  nofall: { title: 'Fallschaden-Immunität (NoFall)', desc: 'Unterdrückung von Fallschaden', risk: 'high' },
};

const SAFE_PATTERNS = [
  'performance',
  'fps',
  'optimization',
  'rendering',
  'shader',
  'visual',
  'cosmetic',
  'hud',
  'gui',
  'tooltip',
  'zoom',
  'capes',
  'sodium',
  'iris',
  'lithium',
  'ferritecore',
  'immediatelyfast',
];

/**
 * Heuristic fallback engine when no Gemini API key is configured.
 */
function analyzeHeuristically(
  modName: string,
  content: string,
  versionNumber?: string
): AnalysisRecommendation {
  const lower = content.toLowerCase();
  const detectedFeatures: string[] = [];
  const suggestedRestrictions: Array<{ title: string; description: string }> = [];
  let riskLevel: 'low' | 'medium' | 'high' = 'low';

  for (const [kw, info] of Object.entries(CRITICAL_KEYWORDS)) {
    if (lower.includes(kw)) {
      detectedFeatures.push(info.title);
      suggestedRestrictions.push({
        title: info.title,
        description: `Hinweis aus Versions-Changelog: "${info.desc}". Auf Survivalecke ggf. untersagen oder konfigurativ einschränken.`,
      });
      if (info.risk === 'high') {
        riskLevel = 'high';
      } else if (riskLevel !== 'high') {
        riskLevel = 'medium';
      }
    }
  }

  // Check if mostly safe performance/visual
  const safeMatches = SAFE_PATTERNS.filter((p) => lower.includes(p));
  let recommendedStatus: 'allowed' | 'restricted' | 'blocked' = 'allowed';

  if (riskLevel === 'high') {
    recommendedStatus = 'blocked';
  } else if (riskLevel === 'medium') {
    recommendedStatus = 'restricted';
  } else {
    recommendedStatus = 'allowed';
  }

  let summary = '';
  if (riskLevel === 'high') {
    summary = `Kritische Cheat- oder Automationsfunktionen erkannt (${detectedFeatures.join(', ')}). Es wird dringend empfohlen, den Mod abzulehnen oder strenge Auflagen zu verhängen.`;
  } else if (riskLevel === 'medium') {
    summary = `Relevante Funktionen mit möglicher Server-Auswirkung gefunden (${detectedFeatures.join(', ')}). Status 'Eingeschränkt' mit entsprechenden Auflagen empfohlen.`;
  } else {
    summary = `Keine bedenklichen Spielfluss-Manipulationen festgestellt. Optimierungs- oder Komfort-Mod (${safeMatches.slice(0, 3).join(', ') || 'Unauffällig'}).`;
  }

  const confidence = riskLevel === 'high' ? 92 : riskLevel === 'medium' ? 84 : 88;

  return {
    modName,
    versionNumber,
    riskLevel,
    summary,
    detectedFeatures,
    recommendedStatus,
    suggestedRestrictions,
    confidence,
    reasoning: `Analyse basierend auf Schlagwort- und Feature-Erkennung im Changelog/der Mod-Beschreibung. ${detectedFeatures.length} relevante Merkmale identifiziert.`,
    sourceType: 'heuristic_engine',
  };
}

/**
 * Main AI analysis entry point.
 */
export async function analyzeModContent({
  modName,
  description,
  changelog,
  versionNumber,
}: {
  modName: string;
  description?: string | null;
  changelog?: string | null;
  versionNumber?: string;
}): Promise<AnalysisRecommendation> {
  const combinedContent = [
    `Mod: ${modName}`,
    versionNumber ? `Version: ${versionNumber}` : '',
    changelog ? `Changelog:\n${changelog}` : '',
    description ? `Beschreibung:\n${description}` : '',
  ]
    .filter(Boolean)
    .join('\n\n');

  const geminiApiKey = process.env.GEMINI_API_KEY;

  if (geminiApiKey) {
    try {
      const prompt = `Du bist der Sicherheitsanalyst für den Minecraft-Server "Survivalecke".
Analysiere die folgende Minecraft-Mod-Beschreibung bzw. den Versions-Changelog.

Server-Regeln für Survivalecke:
- Erlaubt: Reine Performance-Mods (Sodium, Iris, Lithium, FerriteCore), reine Optik, HUDs, Chat-Verbesserungen, reine Zoom-Mods ohne Cheat.
- Eingeschränkt: Mods mit mächtigen Hilfsfunktionen (z. B. Litematica ohne Printer, Freecam nur für Screenshots ohne Block-Clipping, Minimaps ohne Höhlen-/Spieler-Radar).
- Verboten: X-Ray, Auto-Clicker, Baritone, Entity-ESP/Radare, Killaura, Aimbot, Fastbreak, Geschwindigkeits- oder Flug-Cheats, Paket-Exploits.

Text zur Prüfung:
"""
${combinedContent.slice(0, 4000)}
"""

Antworte ausschließlich im JSON-Format ohne Markdown-Fences mit folgender Struktur:
{
  "riskLevel": "low" | "medium" | "high",
  "summary": "Kurze deutsche Zusammenfassung (1-2 Sätze)",
  "detectedFeatures": ["Feature 1", "Feature 2"],
  "recommendedStatus": "allowed" | "restricted" | "blocked",
  "suggestedRestrictions": [{"title": "Auflagen-Titel", "description": "Genaue Anweisung"}],
  "confidence": 85,
  "reasoning": "Begründung für den Admin"
}`;

      const res = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${geminiApiKey}`,
        {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            contents: [{ parts: [{ text: prompt }] }],
            generationConfig: { responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(10000),
        }
      );

      if (res.ok) {
        const json = await res.json();
        const text = json.candidates?.[0]?.content?.parts?.[0]?.text;
        if (text) {
          const parsed = JSON.parse(text);
          return {
            modName,
            versionNumber,
            riskLevel: parsed.riskLevel || 'medium',
            summary: parsed.summary || 'Analyse abgeschlossen.',
            detectedFeatures: Array.isArray(parsed.detectedFeatures) ? parsed.detectedFeatures : [],
            recommendedStatus: parsed.recommendedStatus || 'unknown',
            suggestedRestrictions: Array.isArray(parsed.suggestedRestrictions)
              ? parsed.suggestedRestrictions
              : [],
            confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 85,
            reasoning: parsed.reasoning || 'Generiert über KI-Sicherheitsanalyse.',
            sourceType: 'gemini_ai',
          };
        }
      }
    } catch (err) {
      console.warn('Gemini API call failed, falling back to heuristic engine:', err);
    }
  }

  // Fallback to heuristic engine
  return analyzeHeuristically(modName, combinedContent, versionNumber);
}
