// Löser senaste DMG-länken från Sparkle-appcasten vid BUILD-tid.
// Körs en gång per bygge (memoiserat). Om hämtningen felar används fallback.
const APPCAST_URL = "https://updates.heydolly.app/appcast.xml";
const FALLBACK_DMG = "https://updates.heydolly.app/Dolly-1.0.1.dmg";

let cached: Promise<string> | null = null;

async function resolveDownloadUrl(): Promise<string> {
  try {
    const res = await fetch(APPCAST_URL, {
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) throw new Error(`appcast HTTP ${res.status}`);
    const xml = await res.text();

    // Para ihop varje <sparkle:version> med närmast följande .dmg-enclosure
    // och välj den med högst versionsnummer (= senaste releasen).
    const re =
      /<sparkle:version>(\d+)<\/sparkle:version>[\s\S]*?<enclosure[^>]*?url="([^"]+?\.dmg)"/g;
    let best: { version: number; url: string } | null = null;
    for (const m of xml.matchAll(re)) {
      const version = parseInt(m[1], 10);
      if (!best || version > best.version) best = { version, url: m[2] };
    }
    if (best) return best.url;
    throw new Error("ingen .dmg-enclosure hittades i appcasten");
  } catch (err) {
    console.warn(
      `[release] kunde inte lösa senaste DMG (${String(err)}) — använder fallback ${FALLBACK_DMG}`,
    );
    return FALLBACK_DMG;
  }
}

export function getDownloadUrl(): Promise<string> {
  if (!cached) cached = resolveDownloadUrl();
  return cached;
}
