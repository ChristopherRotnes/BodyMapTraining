import { EX_DB } from "./bodymap.jsx";
import { supabase } from "./supabase";
import i18n from "./i18n";
import { CLAUDE_MODEL_TEXT, buildMuscleInferencePrompt } from "./prompts";

export function getIntlLocale() {
  const lang = i18n.language;
  return lang === "nb" ? "no" : lang;
}

const _devErrors = [];

export function logDevError(context, error) {
  if (!import.meta.env.DEV) return;
  const entry = { ts: new Date().toISOString(), context, message: error?.message ?? String(error) };
  _devErrors.push(entry);
  window.dispatchEvent(new CustomEvent("dev-error", { detail: entry }));
  console.error(`[${context}]`, error);
}

export function getDevErrors() { return _devErrors; }

// Calls /api/claude with the Supabase JWT in X-Supabase-Token (not Authorization —
// Azure SWA replaces the Authorization header with its own managed identity token).
// Retries once after a forced token refresh on 401 to recover from expired tokens.
export async function callClaude(body) {
  const makeRequest = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    return fetch("/api/claude", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(session?.access_token ? { "X-Supabase-Token": session.access_token } : {}),
      },
      body: JSON.stringify(body),
    });
  };

  const res = await makeRequest();
  if (res.status !== 401) return res;
  await supabase.auth.refreshSession();
  return makeRequest();
}

export function extractMuscles(session) {
  const primary = new Set();
  const secondary = new Set();
  (session.session_exercises || []).forEach(ex => {
    (ex.muscle_activations || []).forEach(ma => {
      if (ma.activation_type === "primary") primary.add(ma.muscle_id);
      else secondary.add(ma.muscle_id);
    });
  });
  primary.forEach(m => secondary.delete(m));
  return { primary: [...primary], secondary: [...secondary] };
}

// Returns true when val is non-empty but not a valid integer in [1, 99].
export const isInvalidNum = (val) =>
  val != null && val !== "" &&
  (!/^\d+$/.test(String(val).trim()) || parseInt(val, 10) < 1 || parseInt(val, 10) > 99);

export const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

// Detect media type from magic bytes so the declared type always matches the
// actual content — browsers sometimes report the wrong file.type (e.g. a JPEG
// saved with a .png extension), which causes Anthropic to reject the request.
export async function detectMediaType(file) {
  const buf = await file.slice(0, 12).arrayBuffer();
  const b = new Uint8Array(buf);
  if (b[0] === 0xFF && b[1] === 0xD8) return "image/jpeg";
  if (b[0] === 0x89 && b[1] === 0x50 && b[2] === 0x4E && b[3] === 0x47) return "image/png";
  if (b[0] === 0x47 && b[1] === 0x49 && b[2] === 0x46) return "image/gif";
  if (b[0] === 0x52 && b[1] === 0x49 && b[2] === 0x46 && b[3] === 0x46 &&
      b[8] === 0x57 && b[9] === 0x45 && b[10] === 0x42 && b[11] === 0x50) return "image/webp";
  return file.type || "image/jpeg";
}

// Compress an image to JPEG and ensure decoded size is under Anthropic's 5 MB limit.
// Strategy:
//   1. Read via FileReader — iOS auto-converts HEIF/HEIC to JPEG at full native
//      resolution. If the result is already under 5 MB, use it directly with zero
//      quality loss (this is the happy path for most photos).
//   2. Only if over 5 MB: load the original file via a blob URL, NOT the huge data URL
//      string (iOS Safari silently fails to decode large data URLs — naturalWidth = 0).
//      Start at 2048px long edge and step quality 0.9→0.3. If quality alone doesn't
//      reduce size (iOS Safari ignores the quality param on some versions), shrink
//      dimensions by 30% and retry from quality 0.9. Repeat until it fits or we reach
//      800px, then resolve unconditionally.
export function compressImage(file, maxDecodedBytes = 5 * 1024 * 1024) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Kunne ikke laste bildet'));
    reader.onload = () => {
      const dataUrl = reader.result;
      const b64 = dataUrl.split(',')[1];
      // base64 decoded bytes ≈ b64.length × 3/4
      if (b64.length * 0.75 <= maxDecodedBytes) {
        resolve({ base64: b64, mediaType: 'image/jpeg' });
        return;
      }
      // Over limit — use a blob URL so iOS can decode the image reliably.
      const blobUrl = URL.createObjectURL(file);
      const img = new Image();
      img.onerror = () => { URL.revokeObjectURL(blobUrl); reject(new Error('Kunne ikke laste bildet')); };
      img.onload = () => {
        URL.revokeObjectURL(blobUrl);
        // tryDimension: draw image at maxEdge px long edge, then step quality down.
        // If quality stepping doesn't reduce size (iOS ignores quality param), shrink
        // dimensions by 30% and retry. Stop at 800px — accept whatever we have.
        const tryDimension = (maxEdge) => {
          let w = img.naturalWidth;
          let h = img.naturalHeight;
          if (Math.max(w, h) > maxEdge) {
            if (w >= h) { h = Math.round(h * maxEdge / w); w = maxEdge; }
            else { w = Math.round(w * maxEdge / h); h = maxEdge; }
          }
          const canvas = document.createElement('canvas');
          canvas.width = w;
          canvas.height = h;
          canvas.getContext('2d').drawImage(img, 0, 0, w, h);
          const tryQuality = (quality) => {
            const d = canvas.toDataURL('image/jpeg', quality);
            const b = d.split(',')[1];
            if (b.length * 0.75 <= maxDecodedBytes) {
              resolve({ base64: b, mediaType: 'image/jpeg' });
              return;
            }
            if (quality > 0.3) { tryQuality(parseFloat((quality - 0.1).toFixed(1))); return; }
            // Quality exhausted — shrink dimensions and retry
            if (maxEdge > 800) { tryDimension(Math.round(maxEdge * 0.7)); return; }
            resolve({ base64: b, mediaType: 'image/jpeg' });
          };
          tryQuality(0.9);
        };
        tryDimension(2048);
      };
      img.src = blobUrl;
    };
    reader.readAsDataURL(file);
  });
}

// Builds muscle-ID → exercise-name map from a live exercises array (confirm/edit step).
// Falls back to EX_DB keyword matching for exercises without Claude-assigned muscle data.
export function buildMuscleMapFromExercises(exercises) {
  const map = {};
  exercises.filter(e => e.enabled && e.name).forEach(ex => {
    if (ex.primary?.length || ex.secondary?.length) {
      [...(ex.primary || []), ...(ex.secondary || [])].forEach(id => {
        if (!map[id]) map[id] = [];
        if (!map[id].includes(ex.name)) map[id].push(ex.name);
      });
    } else {
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) {
          [...rule.p, ...rule.s].forEach(id => {
            if (!map[id]) map[id] = [];
            if (!map[id].includes(ex.name)) map[id].push(ex.name);
          });
          break;
        }
      }
    }
  });
  return map;
}

// Builds muscle-ID → exercise-name map from a saved session object (History read mode).
export function buildMuscleMapFromSession(session) {
  const map = {};
  (session.session_exercises || []).forEach(ex => {
    (ex.muscle_activations || []).forEach(ma => {
      if (!map[ma.muscle_id]) map[ma.muscle_id] = [];
      if (!map[ma.muscle_id].includes(ex.name)) map[ma.muscle_id].push(ex.name);
    });
  });
  return map;
}

// Returns ISO week string e.g. "2026-W19" for a given Date.
export function toWeekIso(date) {
  const d = new Date(Date.UTC(date.getFullYear(), date.getMonth(), date.getDate()));
  const day = d.getUTCDay() || 7;
  d.setUTCDate(d.getUTCDate() + 4 - day);
  const yearStart = new Date(Date.UTC(d.getUTCFullYear(), 0, 1));
  const week = Math.ceil(((d - yearStart) / 86400000 + 1) / 7);
  return `${d.getUTCFullYear()}-W${String(week).padStart(2, "0")}`;
}

// Returns the local-time Monday of the ISO week containing date.
export function isoWeekMonday(date) {
  const d = new Date(date);
  const day = d.getDay() || 7;
  d.setDate(d.getDate() - (day - 1));
  d.setHours(0, 0, 0, 0);
  return d;
}

// Formats a Date as "yyyy-MM-dd" using local time getters.
export function toIsoDate(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

// Returns the Monday Date for a given ISO week string e.g. "2026-W19".
export function weekIsoToMonday(weekIso) {
  const [yearStr, weekStr] = weekIso.split("-W");
  const year = parseInt(yearStr, 10);
  const week = parseInt(weekStr, 10);
  const jan4 = new Date(Date.UTC(year, 0, 4));
  const day = jan4.getUTCDay() || 7;
  const monday = new Date(jan4);
  monday.setUTCDate(jan4.getUTCDate() - (day - 1) + (week - 1) * 7);
  return monday;
}

// Builds muscle-ID → exercise-name map from a recommendations array.
// Infers primary/secondary muscle IDs for a given exercise name via Claude text API.
// Returns { primary: string[], secondary: string[] } or null on failure/empty result.
export async function inferMusclesFromName(name) {
  const trimmed = name?.trim();
  if (!trimmed) return null;
  try {
    const res = await callClaude({
      model: CLAUDE_MODEL_TEXT,
      max_tokens: 200,
      messages: [{ role: "user", content: buildMuscleInferencePrompt(trimmed) }],
    });
    const data = await res.json();
    const raw = data.content?.[0]?.text?.trim();
    if (!raw) return null;
    // Extract JSON robustly — handles accidental markdown code fences
    const match = raw.match(/\{[\s\S]*\}/);
    if (!match) return null;
    const parsed = JSON.parse(match[0]);
    const primary = Array.isArray(parsed.primary) ? parsed.primary : [];
    const secondary = Array.isArray(parsed.secondary) ? parsed.secondary : [];
    return (primary.length || secondary.length) ? { primary, secondary } : null;
  } catch {
    return null;
  }
}

export function buildRecMuscleMap(recs) {
  const map = {};
  (recs || []).forEach(r => {
    [...(r.primary || []), ...(r.secondary || [])].forEach(id => {
      if (!map[id]) map[id] = [];
      if (!map[id].includes(r.name)) map[id].push(r.name);
    });
  });
  return map;
}
