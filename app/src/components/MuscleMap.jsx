import React, { useState, useRef, useCallback } from "react";
import { saveSession } from "../lib/db";
import {
  Header, HeaderName, HeaderGlobalBar, HeaderGlobalAction, SkipToContent,
  Button, Checkbox,
  ProgressIndicator, ProgressStep,
  InlineNotification, InlineLoading,
  Tag,
} from "@carbon/react";
import { Add, TrashCan, ArrowLeft, ArrowRight, Renew, Camera, Asleep, Light, Ai } from "@carbon/icons-react";
import { useTheme } from "../theme";

// ── EXERCISE → MUSCLE DATABASE ────────────────────────────────────────
const EX_DB = [
  { kw: ["benkpress","bench press","chest press","push up","pushup","armhevinger","brystpress","flies","fly","pec deck"], p: ["chest"], s: ["shoulders_front","triceps"] },
  { kw: ["skulderpress","shoulder press","overhead press","ohp","militærpress","military press","arnold"], p: ["shoulders_front","shoulders_side"], s: ["triceps","traps"] },
  { kw: ["sidehev","lateral raise","lateral"], p: ["shoulders_side"], s: [] },
  { kw: ["fronthev","front raise"], p: ["shoulders_front"], s: [] },
  { kw: ["face pull","rear delt","bakre delt"], p: ["rear_delts","traps"], s: [] },
  { kw: ["pullup","pull-up","chin up","chinup","chins"], p: ["lats","biceps"], s: ["rear_delts"] },
  { kw: ["pulldown","nedtrekk","lat pull"], p: ["lats"], s: ["biceps"] },
  { kw: ["roing","row","rodd","t-bar"], p: ["lats","rear_delts"], s: ["biceps","traps"] },
  { kw: ["markløft","deadlift","rdl","romanian","stiff leg"], p: ["hamstrings","glutes","lower_back"], s: ["traps","lats"] },
  { kw: ["knebøy","squat","goblet"], p: ["quads","glutes"], s: ["hamstrings","calves"] },
  { kw: ["leg press","beinpress","hack squat"], p: ["quads","glutes"], s: ["hamstrings"] },
  { kw: ["lunge","utfall","step up","bulgarian"], p: ["quads","glutes"], s: ["hamstrings","calves"] },
  { kw: ["leg curl","hamstring curl","bein curl"], p: ["hamstrings"], s: [] },
  { kw: ["hip thrust","glute bridge"], p: ["glutes"], s: ["hamstrings"] },
  { kw: ["bicep curl","curl","hammer curl","preacher"], p: ["biceps"], s: ["forearms"] },
  { kw: ["tricep","skull crusher","pushdown","dip"], p: ["triceps"], s: ["shoulders_front"] },
  { kw: ["planke","plank"], p: ["abs","obliques"], s: ["lower_back"] },
  { kw: ["situp","sit up","crunch","cable crunch"], p: ["abs"], s: ["obliques"] },
  { kw: ["russian twist","woodchop","oblique"], p: ["obliques","abs"], s: [] },
  { kw: ["tåhev","calf raise","calf"], p: ["calves","calves_back"], s: [] },
  { kw: ["hyperextension","back extension","ryggstrekning"], p: ["lower_back","glutes"], s: ["hamstrings"] },
  { kw: ["shrug","skuldertrekk","upright row"], p: ["traps"], s: ["shoulders_side"] },
];

// ── MUSCLE METADATA ───────────────────────────────────────────────────
const MUSCLES = {
  chest:           { label: "Bryst",            view: "front" },
  shoulders_front: { label: "Fremre skuldre",   view: "front" },
  shoulders_side:  { label: "Laterale skuldre", view: "front" },
  biceps:          { label: "Biceps",           view: "front" },
  forearms:        { label: "Underarmer",       view: "front" },
  abs:             { label: "Mage",             view: "front" },
  obliques:        { label: "Oblique",          view: "front" },
  quads:           { label: "Quadriceps",       view: "front" },
  calves:          { label: "Legg",             view: "front" },
  traps:           { label: "Trapezius",        view: "back"  },
  rear_delts:      { label: "Bakre skuldre",    view: "back"  },
  lats:            { label: "Latissimus",       view: "back"  },
  triceps:         { label: "Triceps",          view: "back"  },
  lower_back:      { label: "Korsrygg",         view: "back"  },
  glutes:          { label: "Sete",             view: "back"  },
  hamstrings:      { label: "Hamstrings",       view: "back"  },
  calves_back:     { label: "Legg (bak)",       view: "back"  },
};

// SVG ellipse positions on 160×355 viewBox
const SHAPES = {
  chest:           [{ cx:63, cy:78, rx:16, ry:11 }, { cx:97, cy:78, rx:16, ry:11 }],
  shoulders_front: [{ cx:35, cy:62, rx:13, ry:10 }, { cx:125, cy:62, rx:13, ry:10 }],
  shoulders_side:  [{ cx:32, cy:67, rx:10, ry:9  }, { cx:128, cy:67, rx:10, ry:9  }],
  biceps:          [{ cx:21, cy:96, rx:9,  ry:15 }, { cx:139, cy:96, rx:9,  ry:15 }],
  forearms:        [{ cx:17, cy:128, rx:8, ry:14 }, { cx:143, cy:128, rx:8, ry:14 }],
  abs:             [{ cx:80, cy:108, rx:13, ry:26 }],
  obliques:        [{ cx:58, cy:110, rx:10, ry:21 }, { cx:102, cy:110, rx:10, ry:21 }],
  quads:           [{ cx:63, cy:212, rx:18, ry:37 }, { cx:97, cy:212, rx:18, ry:37 }],
  calves:          [{ cx:63, cy:292, rx:12, ry:24 }, { cx:97, cy:292, rx:12, ry:24 }],
  traps:           [{ cx:80, cy:62, rx:26, ry:13 }],
  rear_delts:      [{ cx:35, cy:65, rx:13, ry:10 }, { cx:125, cy:65, rx:13, ry:10 }],
  lats:            [{ cx:52, cy:92, rx:19, ry:27 }, { cx:108, cy:92, rx:19, ry:27 }],
  triceps:         [{ cx:21, cy:96, rx:9,  ry:15 }, { cx:139, cy:96, rx:9,  ry:15 }],
  lower_back:      [{ cx:80, cy:124, rx:20, ry:13 }],
  glutes:          [{ cx:63, cy:168, rx:18, ry:19 }, { cx:97, cy:168, rx:18, ry:19 }],
  hamstrings:      [{ cx:63, cy:218, rx:17, ry:33 }, { cx:97, cy:218, rx:17, ry:33 }],
  calves_back:     [{ cx:63, cy:292, rx:13, ry:24 }, { cx:97, cy:292, rx:13, ry:24 }],
};

const BODY_POLY = "30,50 17,52 11,132 17,148 24,152 25,132 30,62 50,57 55,118 51,148 48,162 48,355 78,355 78,162 82,162 82,355 112,355 112,162 109,148 105,118 110,57 130,62 135,132 136,152 143,148 149,132 143,52 130,50";

// Carbon palette: green-50 for primary, blue-40 for secondary
const PRIMARY_FILL   = "rgba(36,161,72,0.78)";
const PRIMARY_HOVER  = "rgba(36,161,72,1)";
const PRIMARY_STROKE = "rgba(36,161,72,0.5)";
const SEC_FILL       = "rgba(120,169,255,0.45)";
const SEC_HOVER      = "rgba(120,169,255,0.7)";
const SEC_STROKE     = "rgba(120,169,255,0.25)";

// ── HELPERS ───────────────────────────────────────────────────────────
const toBase64 = (file) => new Promise((res, rej) => {
  const r = new FileReader();
  r.onload = () => res(r.result.split(",")[1]);
  r.onerror = rej;
  r.readAsDataURL(file);
});

const getMediaType = (file) => {
  const t = { "image/png": "image/png", "image/gif": "image/gif", "image/webp": "image/webp" };
  return t[file.type] || "image/jpeg";
};

function calcMuscles(exercises) {
  const p = new Set(), s = new Set();
  exercises.forEach(ex => {
    if (ex.primary?.length || ex.secondary?.length) {
      (ex.primary || []).forEach(m => p.add(m));
      (ex.secondary || []).forEach(m => s.add(m));
    } else {
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) {
          rule.p.forEach(m => p.add(m));
          rule.s.forEach(m => s.add(m));
          break;
        }
      }
    }
  });
  p.forEach(m => s.delete(m));
  return { primary: [...p], secondary: [...s] };
}

// ── BODY SVG ──────────────────────────────────────────────────────────
function BodySVG({ view, primary, secondary, muscleMap = {} }) {
  const pSet = new Set(primary);
  const sSet = new Set(secondary);
  const [tooltip, setTooltip] = React.useState(null);
  const wrapRef = React.useRef();

  const handleEnter = (id, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleMove = (id, e) => {
    const rect = wrapRef.current?.getBoundingClientRect();
    if (!rect) return;
    setTooltip({ id, x: e.clientX - rect.left, y: e.clientY - rect.top });
  };
  const handleLeave = () => setTooltip(null);

  return (
    <div ref={wrapRef} style={{ position: "relative", width: "100%" }}>
      <svg viewBox="0 0 160 360" xmlns="http://www.w3.org/2000/svg"
        style={{ width: "100%", height: "auto", display: "block" }}>
        <defs>
          <filter id={`glow-${view}`} x="-60%" y="-60%" width="220%" height="220%">
            <feGaussianBlur stdDeviation="3.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
          <filter id={`softglow-${view}`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" result="blur" />
            <feMerge><feMergeNode in="blur" /><feMergeNode in="SourceGraphic" /></feMerge>
          </filter>
        </defs>

        <g style={{ fill: "var(--cds-layer-02)", stroke: "var(--cds-border-subtle-01)" }} strokeWidth="0.6">
          <circle cx="80" cy="21" r="17" />
          <polygon points="74,37 86,37 87,50 73,50" />
          <polygon points={BODY_POLY} />
        </g>

        {Object.entries(SHAPES)
          .filter(([id]) => MUSCLES[id]?.view === view)
          .map(([id, shapes]) => {
            const isPrimary = pSet.has(id);
            const isSec = sSet.has(id);
            if (!isPrimary && !isSec) return null;
            const isHovered = tooltip?.id === id;
            return (
              <g key={id} filter={`url(#${isPrimary ? "glow" : "softglow"}-${view})`}
                style={{ cursor: muscleMap[id]?.length ? "pointer" : "default" }}
                onMouseEnter={e => handleEnter(id, e)}
                onMouseMove={e => handleMove(id, e)}
                onMouseLeave={handleLeave}>
                {shapes.map((sh, i) => (
                  <ellipse key={i} cx={sh.cx} cy={sh.cy} rx={sh.rx} ry={sh.ry}
                    fill={isPrimary
                      ? (isHovered ? PRIMARY_HOVER : PRIMARY_FILL)
                      : (isHovered ? SEC_HOVER : SEC_FILL)}
                    stroke={isPrimary ? PRIMARY_STROKE : SEC_STROKE}
                    strokeWidth="0.8"
                    style={{ transition: "fill 0.15s" }} />
                ))}
              </g>
            );
          })}

        <text x="80" y="352" textAnchor="middle" fontSize="7.5"
          fontFamily="var(--cds-font-mono)" letterSpacing="2"
          style={{ fill: "var(--cds-text-secondary)" }}>
          {view === "front" ? "FRONT" : "BACK"}
        </text>
      </svg>

      {tooltip && muscleMap[tooltip.id]?.length > 0 && (
        <div style={{
          position: "absolute",
          left: Math.min(tooltip.x + 10, (wrapRef.current?.offsetWidth || 200) - 140),
          top: Math.max(tooltip.y - 10, 4),
          background: "var(--cds-layer-02)",
          border: "1px solid var(--cds-border-subtle-01)",
          padding: "8px 10px",
          pointerEvents: "none",
          zIndex: 10,
          minWidth: 120,
          maxWidth: 160,
        }}>
          <div style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "1px", marginBottom: 5, fontFamily: "var(--cds-font-mono)" }}>
            {MUSCLES[tooltip.id]?.label?.toUpperCase()}
          </div>
          {muscleMap[tooltip.id].map((ex, i) => (
            <div key={i} style={{ fontSize: 12, color: "var(--cds-text-primary)", padding: "2px 0", borderBottom: i < muscleMap[tooltip.id].length - 1 ? "1px solid var(--cds-border-subtle-01)" : "none" }}>
              {ex}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// ── MUSCLE MAP BUILDERS ───────────────────────────────────────────────
function buildMuscleMap(exercises) {
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

function buildRecMuscleMap(recs) {
  const map = {};
  (recs || []).forEach(r => {
    [...(r.primary || []), ...(r.secondary || [])].forEach(id => {
      if (!map[id]) map[id] = [];
      if (!map[id].includes(r.name)) map[id].push(r.name);
    });
  });
  return map;
}

// ── MAIN COMPONENT ────────────────────────────────────────────────────
export default function MuscleMap() {
  const { theme, setTheme } = useTheme();
  const [step, setStep] = useState("upload");
  const [images, setImages] = useState([]);
  const [exercises, setExercises] = useState([]);
  const [muscles, setMuscles] = useState({ primary: [], secondary: [] });
  const [error, setError] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [recs, setRecs] = useState(null);
  const [loadingRecs, setLoadingRecs] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [saveError, setSaveError] = useState(false);
  const fileRef = useRef();

  const stepIndex = { upload: 0, analyzing: 0, confirm: 1, muscles: 2 }[step] ?? 0;

  const addImage = useCallback(async (file) => {
    if (!file || !file.type.startsWith("image/")) return;
    const mt = getMediaType(file);
    const b64 = await toBase64(file);
    setImages(prev => [...prev, { id: Date.now() + Math.random(), base64: b64, mediaType: mt, preview: `data:${mt};base64,${b64}` }]);
    setError(null);
  }, []);

  const handleFiles = useCallback(async (files) => {
    for (const file of Array.from(files)) await addImage(file);
  }, [addImage]);

  const analyze = async () => {
    setStep("analyzing"); setError(null);
    try {
      const imageBlocks = images.map(img => ({
        type: "image",
        source: { type: "base64", media_type: img.mediaType, data: img.base64 },
      }));
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-opus-4-5",
          max_tokens: 1500,
          messages: [{
            role: "user",
            content: [
              ...imageBlocks,
              { type: "text", text: `Du ser ett eller flere bilder av treningsprogrammer fra norske treningsstudio-tavler (gjerne håndskrevet).
Identifiser ALLE treningsøvelser fra alle bildene. Ikke dupliser øvelser som finnes i flere bilder.
For hver øvelse, angi hvilke muskler som er primære og sekundære.
Bruk KUN disse muscle-ID-ene: chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves, traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Nøyaktig navn fra tavlen","standardName":"Standard norsk/engelsk navn","sets":"3","reps":"10","primary":["chest"],"secondary":["shoulders_front","triceps"]}]
"sets" og "reps" er null om ikke skrevet. Finn du ingen øvelser, returner: []` }
            ]
          }]
        })
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      const parsed = JSON.parse(text);
      if (!Array.isArray(parsed)) throw new Error();
      setExercises(parsed.map((ex, i) => ({ ...ex, id: i, enabled: true, sets: ex.sets ?? "1" })));
      setStep("confirm");
    } catch (err) {
      const msg = err?.status === 401
        ? "API-nøkkel feil. Sjekk ANTHROPIC_API_KEY i Azure-miljøet."
        : "Kunne ikke tolke bildet. Prøv igjen med et tydeligere bilde.";
      setError(msg);
      setStep("upload");
    }
  };

  const confirm = () => {
    const enabled = exercises.filter(e => e.enabled && e.name);
    const enriched = enabled.map(ex => {
      if (ex.primary?.length || ex.secondary?.length) return ex;
      const txt = (ex.name + " " + (ex.standardName || "")).toLowerCase();
      for (const rule of EX_DB) {
        if (rule.kw.some(k => txt.includes(k))) return { ...ex, primary: rule.p, secondary: rule.s };
      }
      return ex;
    });
    setMuscles(calcMuscles(enriched));
    setStep("muscles");
    setSaving(true); setSaved(false); setSaveError(false);
    saveSession(enriched)
      .then(() => setSaved(true))
      .catch(err => { console.error("Lagring feilet:", err); setSaveError(true); })
      .finally(() => setSaving(false));
  };

  const reset = () => {
    setStep("upload"); setImages([]);
    setExercises([]); setMuscles({ primary: [], secondary: [] });
    setError(null); setRecs(null);
    setSaving(false); setSaved(false); setSaveError(false);
  };

  const getUntrainedMuscles = () =>
    Object.keys(MUSCLES).filter(id => !muscles.primary.includes(id) && !muscles.secondary.includes(id));

  const recommend = async () => {
    setLoadingRecs(true); setRecs(null);
    const untrained = getUntrainedMuscles().map(id => MUSCLES[id].label);
    const trained = [...muscles.primary, ...muscles.secondary].map(id => MUSCLES[id]?.label).filter(Boolean);
    try {
      const res = await fetch("/api/claude", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-5",
          max_tokens: 1000,
          messages: [{
            role: "user",
            content: `Du er en personlig trener. Brukeren har trent disse musklene i dag: ${trained.join(", ")}.
Muskelgrupper som IKKE er trent: ${untrained.join(", ")}.
Foreslå 5 øvelser som dekker de utrente musklene. Gjerne øvelser som er vanlige på norske treningssentre.
Bruk KUN disse muscle-ID-ene: chest, shoulders_front, shoulders_side, biceps, forearms, abs, obliques, quads, calves, traps, rear_delts, lats, triceps, lower_back, glutes, hamstrings, calves_back.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Øvelsesnavn","primary":["muscle_id"],"secondary":["muscle_id"],"tip":"Kort praktisk tips på norsk"}]`
          }]
        })
      });
      const data = await res.json();
      const text = (data.content || []).map(b => b.text || "").join("").replace(/```json|```/g, "").trim();
      setRecs(JSON.parse(text));
    } catch { setRecs([]); }
    setLoadingRecs(false);
  };

  // ── RENDER ────────────────────────────────────────────────────────
  return (
    <>
      <Header aria-label="Workout Lens">
        <SkipToContent />
        <HeaderName href="#" prefix="">Workout Lens</HeaderName>
        <HeaderGlobalBar>
          <HeaderGlobalAction
            aria-label={theme === "g10" ? "Bytt til mørkt tema" : "Bytt til lyst tema"}
            onClick={() => setTheme(theme === "g10" ? "g100" : "g10")}
          >
            {theme === "g10" ? <Asleep size={20} /> : <Light size={20} />}
          </HeaderGlobalAction>
        </HeaderGlobalBar>
      </Header>

      <main style={{ paddingTop: 48, minHeight: "100vh", background: "var(--cds-background)" }}>
        <div style={{ maxWidth: 540, margin: "0 auto", padding: "24px 20px" }}>

          <ProgressIndicator currentIndex={stepIndex} spaceEqually style={{ marginBottom: 28 }}>
            <ProgressStep label="Last opp bilde" />
            <ProgressStep label="Bekreft øvelser" />
            <ProgressStep label="Muskelkart" />
          </ProgressIndicator>

          {/* ── UPLOAD ── */}
          {step === "upload" && (
            <div className="fade-in">
              <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
                Last opp ett eller flere bilder av treningsprogrammet.
              </p>

              {images.length === 0 ? (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                  onClick={() => fileRef.current?.click()}
                  style={{
                    border: `2px dashed ${dragging ? "var(--cds-interactive)" : "var(--cds-border-subtle-01)"}`,
                    background: dragging ? "var(--cds-layer-hover-01)" : "transparent",
                    marginBottom: 14,
                    cursor: "pointer",
                    minHeight: 200,
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    transition: "border-color 0.2s, background 0.2s",
                  }}
                >
                  <div style={{ textAlign: "center", padding: "40px 20px" }}>
                    <Camera size={40} style={{ color: "var(--cds-text-secondary)", marginBottom: 12 }} />
                    <p style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>Trykk for å velge bilde</p>
                    <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>eller dra og slipp · JPEG, PNG, WebP · flere bilder støttes</p>
                  </div>
                </div>
              ) : (
                <div
                  onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
                  onDragLeave={() => setDragging(false)}
                  onDrop={(e) => { e.preventDefault(); setDragging(false); handleFiles(e.dataTransfer.files); }}
                  style={{ marginBottom: 14 }}
                >
                  <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 8 }}>
                    {images.map(img => (
                      <div key={img.id} style={{ position: "relative", overflow: "hidden", aspectRatio: "1", background: "var(--cds-layer-01)" }}>
                        <img src={img.preview} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block" }} />
                        <button
                          onClick={() => setImages(p => p.filter(i => i.id !== img.id))}
                          style={{
                            position: "absolute", top: 4, right: 4,
                            background: "rgba(0,0,0,0.75)", border: "none",
                            color: "#fff", width: 24, height: 24,
                            fontSize: 16, lineHeight: "24px", textAlign: "center",
                            padding: 0, cursor: "pointer",
                          }}>
                          ×
                        </button>
                      </div>
                    ))}
                    <div
                      onClick={() => fileRef.current?.click()}
                      style={{
                        border: `2px dashed ${dragging ? "var(--cds-interactive)" : "var(--cds-border-subtle-01)"}`,
                        background: dragging ? "var(--cds-layer-hover-01)" : "transparent",
                        display: "flex", flexDirection: "column",
                        alignItems: "center", justifyContent: "center",
                        aspectRatio: "1", cursor: "pointer", gap: 4,
                        transition: "border-color 0.2s",
                      }}>
                      <Add size={20} style={{ color: "var(--cds-text-secondary)" }} />
                      <span style={{ fontSize: 10, color: "var(--cds-text-secondary)", letterSpacing: "0.5px" }}>Legg til</span>
                    </div>
                  </div>
                </div>
              )}

              <input ref={fileRef} type="file" accept="image/*" multiple
                style={{ display: "none" }}
                onChange={(e) => handleFiles(e.target.files)} />

              {error && (
                <InlineNotification
                  kind="error"
                  title="Feil:"
                  subtitle={error}
                  hideCloseButton
                  lowContrast
                  style={{ marginBottom: 14 }}
                />
              )}

              <Button
                kind="primary"
                renderIcon={images.length > 0 ? ArrowRight : Camera}
                onClick={images.length > 0 ? analyze : () => fileRef.current?.click()}
                style={{ width: "100%", maxWidth: "100%" }}
              >
                {images.length > 1
                  ? `Analyser ${images.length} bilder`
                  : images.length === 1
                    ? "Analyser program"
                    : "Velg bilde"}
              </Button>
            </div>
          )}

          {/* ── ANALYZING ── */}
          {step === "analyzing" && (
            <div style={{ textAlign: "center", padding: "70px 0" }}>
              <InlineLoading
                description="Leser treningsprogram og identifiserer øvelser…"
                status="active"
                style={{ justifyContent: "center" }}
              />
            </div>
          )}

          {/* ── CONFIRM ── */}
          {step === "confirm" && (
            <div className="fade-in">
              <p style={{ fontSize: 14, color: "var(--cds-text-secondary)", marginBottom: 16 }}>
                {exercises.length > 0
                  ? `Fant ${exercises.length} øvelse${exercises.length !== 1 ? "r" : ""}. Juster om nødvendig:`
                  : "Ingen øvelser funnet. Legg til manuelt:"}
              </p>

              <div style={{ display: "flex", flexDirection: "column", gap: 4, marginBottom: 12 }}>
                {exercises.map((ex) => (
                  <div key={ex.id} style={{
                    background: ex.enabled ? "var(--cds-layer-01)" : "transparent",
                    border: `1px solid var(--cds-border-subtle-01)`,
                    padding: "10px 12px",
                    display: "flex",
                    alignItems: "flex-start",
                    gap: 10,
                    opacity: ex.enabled ? 1 : 0.4,
                    transition: "opacity 0.15s",
                  }}>
                    <Checkbox
                      id={`ex-${ex.id}`}
                      labelText=""
                      hideLabel
                      checked={ex.enabled}
                      onChange={() => setExercises(p => p.map(e => e.id === ex.id ? { ...e, enabled: !e.enabled } : e))}
                      style={{ marginTop: 2 }}
                    />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      {editingId === ex.id ? (
                        <input
                          autoFocus
                          value={ex.name}
                          onChange={(e) => setExercises(p => p.map(x => x.id === ex.id ? { ...x, name: e.target.value, standardName: e.target.value } : x))}
                          onBlur={() => setEditingId(null)}
                          onKeyDown={(e) => e.key === "Enter" && setEditingId(null)}
                          style={{
                            width: "100%",
                            background: "transparent",
                            border: "none",
                            borderBottom: "2px solid var(--cds-interactive)",
                            color: "var(--cds-text-primary)",
                            fontFamily: "var(--cds-font-sans)",
                            fontSize: 14,
                            padding: "2px 0",
                            outline: "none",
                          }}
                        />
                      ) : (
                        <div
                          onClick={() => setEditingId(ex.id)}
                          style={{ fontSize: 14, fontWeight: 500, cursor: "text", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "var(--cds-text-primary)" }}
                        >
                          {ex.name || <span style={{ color: "var(--cds-text-secondary)" }}>Klikk for å skrive øvelse…</span>}
                        </div>
                      )}
                      <div style={{ display: "flex", gap: 8, marginTop: 6 }}>
                        {["sets", "reps"].map(field => (
                          <div key={field} style={{ display: "flex", alignItems: "center", gap: 4 }}>
                            <input
                              type="number"
                              min="1"
                              placeholder={field === "sets" ? "sett" : "reps"}
                              value={ex[field] || ""}
                              onChange={e => setExercises(p => p.map(x => x.id === ex.id ? { ...x, [field]: e.target.value } : x))}
                              style={{
                                width: 52,
                                height: 32,
                                padding: "0 8px",
                                background: "var(--cds-field-01)",
                                border: "1px solid var(--cds-border-strong-01)",
                                color: "var(--cds-text-primary)",
                                fontFamily: "var(--cds-font-sans)",
                                fontSize: 12,
                                outline: "none",
                                textAlign: "center",
                              }}
                            />
                            <span style={{ fontSize: 11, color: "var(--cds-text-secondary)" }}>
                              {field === "sets" ? "sett" : "reps"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    <Button
                      kind="ghost"
                      hasIconOnly
                      renderIcon={TrashCan}
                      iconDescription="Slett øvelse"
                      size="sm"
                      onClick={() => setExercises(p => p.filter(e => e.id !== ex.id))}
                    />
                  </div>
                ))}
              </div>

              <Button
                kind="ghost"
                renderIcon={Add}
                onClick={() => {
                  const id = Date.now();
                  setExercises(p => [...p, { id, name: "", standardName: "", sets: null, reps: null, enabled: true }]);
                  setEditingId(id);
                }}
                style={{ width: "100%", marginBottom: 16 }}
              >
                Legg til øvelse manuelt
              </Button>

              <div style={{ display: "flex", gap: 8 }}>
                <Button kind="secondary" renderIcon={ArrowLeft} onClick={() => setStep("upload")}>
                  Tilbake
                </Button>
                <Button
                  kind="primary"
                  renderIcon={ArrowRight}
                  onClick={confirm}
                  disabled={!exercises.some(e => e.enabled && e.name)}
                  style={{ flex: 1 }}
                >
                  Vis muskelkart
                </Button>
              </div>
            </div>
          )}

          {/* ── MUSCLES ── */}
          {step === "muscles" && (
            <div className="fade-in">

              {/* Legend + save status */}
              <div style={{ display: "flex", gap: 12, marginBottom: 18, alignItems: "center", flexWrap: "wrap" }}>
                <Tag type="green" size="sm">Primær ({muscles.primary.length})</Tag>
                <Tag type="blue" size="sm">Sekundær ({muscles.secondary.length})</Tag>
                <div style={{ marginLeft: "auto" }}>
                  {saving && <InlineLoading description="Lagrer…" status="active" />}
                  {saved && <InlineLoading description="Lagret" status="finished" />}
                  {saveError && <InlineLoading description="Lagring feilet" status="error" />}
                </div>
              </div>

              {/* Body maps */}
              <div style={{ display: "flex", gap: 12, marginBottom: 18 }}>
                {["front", "back"].map(view => (
                  <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                    <BodySVG view={view} primary={muscles.primary} secondary={muscles.secondary}
                      muscleMap={buildMuscleMap(exercises)} />
                  </div>
                ))}
              </div>

              {/* Trained muscle groups */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 12 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Trente muskelgrupper
                </p>
                {muscles.primary.length === 0 && muscles.secondary.length === 0 ? (
                  <p style={{ color: "var(--cds-text-secondary)", fontSize: 13 }}>Ingen muskelgrupper gjenkjent for de valgte øvelsene.</p>
                ) : (
                  <>
                    {muscles.primary.map(id => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: PRIMARY_FILL, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-primary)" }}>{MUSCLES[id]?.label || id}</span>
                        <Tag type="green" size="sm">Primær</Tag>
                      </div>
                    ))}
                    {muscles.secondary.map(id => (
                      <div key={id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                        <div style={{ width: 8, height: 8, borderRadius: "50%", background: SEC_FILL, flexShrink: 0 }} />
                        <span style={{ fontSize: 13, flex: 1, color: "var(--cds-text-secondary)" }}>{MUSCLES[id]?.label || id}</span>
                        <Tag type="blue" size="sm">Sekundær</Tag>
                      </div>
                    ))}
                  </>
                )}
              </div>

              {/* Exercises this session */}
              <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 16 }}>
                <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                  Øvelser denne økten
                </p>
                {exercises.filter(e => e.enabled && e.name).map(ex => (
                  <div key={ex.id} style={{ display: "flex", justifyContent: "space-between", padding: "4px 0", fontSize: 13, borderBottom: "1px solid var(--cds-border-subtle-01)", color: "var(--cds-text-primary)" }}>
                    <span>{ex.name}</span>
                    {(ex.sets || ex.reps) && (
                      <span style={{ color: "var(--cds-text-secondary)" }}>{[ex.sets && `${ex.sets}×`, ex.reps].filter(Boolean).join("")}</span>
                    )}
                  </div>
                ))}
              </div>

              {/* Recommendations */}
              <Button
                kind="tertiary"
                renderIcon={Ai}
                onClick={recommend}
                disabled={loadingRecs}
                style={{ width: "100%", maxWidth: "100%", marginBottom: 10 }}
              >
                {loadingRecs ? "Henter anbefalinger…" : "Hva bør jeg trene neste gang?"}
              </Button>

              {recs && recs.length > 0 && (() => {
                const recPrimary  = [...new Set(recs.flatMap(r => r.primary || []))];
                const recSecAll   = [...new Set(recs.flatMap(r => r.secondary || []))];
                const recSecondary = recSecAll.filter(id => !recPrimary.includes(id));
                return (
                  <div className="fade-in">
                    <div style={{ background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: 14, marginBottom: 10 }}>
                      <p style={{ fontSize: 11, color: "var(--cds-text-secondary)", letterSpacing: "2px", marginBottom: 10, fontFamily: "var(--cds-font-mono)", textTransform: "uppercase" }}>
                        Anbefalte øvelser
                      </p>
                      {recs.map((r, i) => (
                        <div key={i} style={{ padding: "8px 0", borderBottom: "1px solid var(--cds-border-subtle-01)" }}>
                          <p style={{ fontSize: 13, fontWeight: 600, marginBottom: 4, color: "var(--cds-text-primary)" }}>{r.name}</p>
                          <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginBottom: r.tip ? 4 : 0 }}>
                            {(r.primary || []).length > 0 && (
                              <Tag type="green" size="sm">{r.primary.map(id => MUSCLES[id]?.label || id).join(", ")}</Tag>
                            )}
                            {(r.secondary || []).length > 0 && (
                              <Tag type="blue" size="sm">{r.secondary.map(id => MUSCLES[id]?.label || id).join(", ")}</Tag>
                            )}
                          </div>
                          {r.tip && <p style={{ fontSize: 12, color: "var(--cds-text-secondary)" }}>{r.tip}</p>}
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginBottom: 10 }}>
                      {["front", "back"].map(view => (
                        <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
                          <BodySVG view={view} primary={recPrimary} secondary={recSecondary}
                            muscleMap={buildRecMuscleMap(recs)} />
                        </div>
                      ))}
                    </div>

                    <div style={{ display: "flex", gap: 12, marginBottom: 12, fontSize: 12 }}>
                      <Tag type="green" size="sm">Primær</Tag>
                      <Tag type="blue" size="sm">Sekundær</Tag>
                    </div>
                  </div>
                );
              })()}

              {recs && recs.length === 0 && (
                <p style={{ fontSize: 13, color: "var(--cds-text-secondary)", textAlign: "center", marginBottom: 10 }}>
                  Ingen anbefalinger tilgjengelig.
                </p>
              )}

              <Button kind="ghost" renderIcon={Renew} onClick={reset} style={{ width: "100%", maxWidth: "100%" }}>
                Logg ny økt
              </Button>
            </div>
          )}

        </div>
      </main>
    </>
  );
}
