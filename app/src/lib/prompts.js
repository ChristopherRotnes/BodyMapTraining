import { MUSCLES } from './bodymap.jsx';

// claude-opus-4-5 is used for vision tasks (whiteboard photo analysis).
export const CLAUDE_MODEL_VISION = "claude-opus-4-5";

// claude-sonnet-4-6 is used for text-only tasks (recommendations).
export const CLAUDE_MODEL_TEXT = "claude-sonnet-4-6";

const MUSCLE_IDS = Object.keys(MUSCLES).join(", ");

const TIP_LANG_INSTRUCTION = {
  nb: "Kort praktisk tips på norsk",
  en: "Short practical tip in English",
  fa: "نکته کوتاه و عملی به فارسی",
};

// Prompt sent alongside whiteboard images to extract exercises + muscle IDs.
export const ANALYZE_PROMPT = `Du ser ett eller flere bilder av treningsprogrammer fra norske treningsstudio-tavler (gjerne håndskrevet).
Identifiser ALLE treningsøvelser fra alle bildene. Ikke dupliser øvelser som finnes i flere bilder.
For hver øvelse, angi hvilke muskler som er primære og sekundære.
Bruk KUN disse muscle-ID-ene: ${MUSCLE_IDS}.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Nøyaktig navn fra tavlen","standardName":"Standard norsk/engelsk navn","sets":"3","reps":"10","primary":["chest"],"secondary":["shoulders_front","triceps"]}]
"sets" og "reps" er null om ikke skrevet. Finn du ingen øvelser, returner: []`;

// Prompt for next-session recommendations after a single logged workout.
export const buildRecommendPrompt = (trained, untrained, lang = 'nb') => {
  const tipInstruction = TIP_LANG_INSTRUCTION[lang] || TIP_LANG_INSTRUCTION.nb;
  return `Du er en personlig trener. Brukeren har trent disse musklene i dag: ${trained.join(", ")}.
Muskelgrupper som IKKE er trent: ${untrained.join(", ")}.
Foreslå 5 øvelser som dekker de utrente musklene. Gjerne øvelser som er vanlige på norske treningssentre.
Bruk KUN disse muscle-ID-ene: ${MUSCLE_IDS}.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Øvelsesnavn","primary":["muscle_id"],"secondary":["muscle_id"],"tip":"${tipInstruction}"}]`;
};

// Prompt for inferring muscle groups from a single exercise name (text-only, cheap call).
export const buildMuscleInferencePrompt = (name) =>
  `Du er en personlig trener. Hvilke muskler trener øvelsen "${name}"?
Bruk KUN disse muscle-ID-ene: ${MUSCLE_IDS}.
Returner KUN JSON, ingen annen tekst, ingen backticks:
{"primary":["muscle_id"],"secondary":["muscle_id"]}
Hvis du er usikker, returner tomme arrays.`;

// Prompt for period-report recommendations based on aggregated training history.
export const buildPeriodRecommendPrompt = (periodDays, sessionCount, trainedLabels, untrainedLabels, lang = 'nb') => {
  const tipInstruction = TIP_LANG_INSTRUCTION[lang] || TIP_LANG_INSTRUCTION.nb;
  return `Du er en personlig trener som analyserer en klients treningshistorikk fra de siste ${periodDays} dagene (${sessionCount} økter).
Trent (primær): ${trainedLabels || "ingen"}.
Ikke trent: ${untrainedLabels || "alle muskelgrupper er dekket"}.
Foreslå 5 øvelser som prioriterer de utrente musklene. Gjerne øvelser som er vanlige på norske treningssentre.
Bruk KUN disse muscle-ID-ene: ${MUSCLE_IDS}.
Returner KUN et JSON-array, ingen annen tekst, ingen backticks:
[{"name":"Øvelsesnavn","primary":["muscle_id"],"secondary":["muscle_id"],"tip":"${tipInstruction}"}]`;
};
