import { EX_DB } from "./bodymap.jsx";
import { supabase } from "./supabase";
import i18n from "./i18n";

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
