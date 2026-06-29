// Turn a pasted link into study text, server-side.
// Supports YouTube (caption transcript) and generic web pages / articles.
// Video-only platforms without captions (X/Twitter, TikTok, Instagram) can't be
// transcribed here — that needs a speech-to-text step we don't run yet.

const UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

function decodeEntities(s) {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&quot;/g, '"')
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&nbsp;/g, " ")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(+n));
}

function youtubeId(url) {
  try {
    const u = new URL(url);
    const h = u.hostname.replace(/^www\./, "");
    if (h === "youtu.be") return u.pathname.slice(1) || null;
    if (h === "youtube.com" || h === "m.youtube.com") {
      if (u.pathname === "/watch") return u.searchParams.get("v");
      const m = u.pathname.match(/^\/(shorts|embed|live)\/([^/?]+)/);
      if (m) return m[2];
    }
  } catch {}
  return null;
}

async function youtubeTranscript(id) {
  // Datacenter IPs (like the Worker's) hit YouTube's consent wall, which serves a
  // page without caption data. The consent cookie + has_verified bypasses it.
  const res = await fetch(
    `https://www.youtube.com/watch?v=${id}&hl=en&bpctr=9999999999&has_verified=1`,
    {
      headers: {
        "User-Agent": UA,
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+1; SOCS=CAISEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
      },
    },
  );
  const html = await res.text();
  const m = html.match(/"captionTracks":(\[.*?\])/);
  if (!m) return null;
  let tracks;
  try {
    tracks = JSON.parse(m[1].replace(/\\u0026/g, "&"));
  } catch {
    return null;
  }
  const track =
    tracks.find((t) => t.languageCode === "en" && t.kind !== "asr") ||
    tracks.find((t) => t.languageCode === "en") ||
    tracks[0];
  if (!track?.baseUrl) return null;

  const x = await fetch(track.baseUrl, { headers: { "User-Agent": UA } });
  const xml = await x.text();
  const lines = [...xml.matchAll(/<text[^>]*>([\s\S]*?)<\/text>/g)].map((mm) =>
    decodeEntities(mm[1].replace(/<[^>]+>/g, " ")),
  );
  const text = lines.join(" ").replace(/\s+/g, " ").trim();
  return text || null;
}

async function pageText(url) {
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) return null;
  const ct = res.headers.get("content-type") || "";
  if (!ct.includes("text/html") && !ct.includes("text/plain")) return null;
  const html = await res.text();
  const body = html
    .replace(/<head[\s\S]*?<\/head>/i, " ")
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
    .replace(/<[^>]+>/g, " ");
  const text = decodeEntities(body).replace(/\s+/g, " ").trim();
  return text || null;
}

// Basic SSRF guard: only public http(s) targets.
export function isValidHttpUrl(raw) {
  try {
    const u = new URL(raw);
    if (u.protocol !== "http:" && u.protocol !== "https:") return false;
    const host = u.hostname.toLowerCase();
    if (
      host === "localhost" ||
      host.endsWith(".local") ||
      /^127\./.test(host) ||
      /^10\./.test(host) ||
      /^192\.168\./.test(host) ||
      /^169\.254\./.test(host) ||
      /^172\.(1[6-9]|2\d|3[01])\./.test(host)
    )
      return false;
    return true;
  } catch {
    return false;
  }
}

export async function fetchSourceText(url) {
  const id = youtubeId(url);
  if (id) {
    const t = await youtubeTranscript(id);
    if (t) return { text: t, kind: "youtube" };
    return {
      error:
        "Couldn't fetch this YouTube transcript automatically. Open the video → “…more → Show transcript”, copy it, and paste it above — or use the NoteJet browser extension on the video page.",
    };
  }

  let host = "";
  try {
    host = new URL(url).hostname.replace(/^www\./, "").toLowerCase();
  } catch {}
  if (/(^|\.)(x|twitter)\.com$|(^|\.)tiktok\.com$|(^|\.)instagram\.com$/.test(host)) {
    return {
      error: `${host} videos can't be transcribed automatically yet (that needs speech-to-text). Paste the transcript or caption text instead.`,
    };
  }

  const t = await pageText(url);
  if (t && t.length > 200) return { text: t, kind: "page" };
  return {
    error: "Couldn't read enough text from that link. Paste the transcript or notes instead.",
  };
}
