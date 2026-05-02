import { EX_DB } from "./bodymap.jsx";

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

export const getMediaType = (file) => {
  const t = { "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp" };
  return t[file.type] || "image/jpeg";
};

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
