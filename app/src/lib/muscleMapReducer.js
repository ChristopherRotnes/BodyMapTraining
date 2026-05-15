import { MUSCLES } from "./bodymap.jsx";

export const localDateStr = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
};

export const initialState = {
  step: "upload",
  images: [],
  exercises: [],
  muscles: { primary: [], secondary: [] },
  error: null,
  dragging: false,
  editingId: null,
  recs: null,
  loadingRecs: false,
  recsError: null,
  saving: false,
  saved: false,
  saveError: false,
  gymSessions: [],
  gymSessionId: "",
  gymCalendarConflict: null,
  sessionDate: localDateStr(),
};

export function reducer(state, action) {
  switch (action.type) {
    case "RESET":
      return { ...initialState, sessionDate: localDateStr() };
    case "ADD_IMAGE":
      return { ...state, images: [...state.images, action.image], error: null };
    case "REMOVE_IMAGE":
      return { ...state, images: state.images.filter(i => i.id !== action.id) };
    case "SET_DRAGGING":
      return { ...state, dragging: action.dragging };
    case "ANALYZE_START":
      return { ...state, step: "analyzing", error: null };
    case "ANALYZE_SUCCESS": {
      const validIds = new Set(Object.keys(MUSCLES));
      const clean = (arr) => (arr || []).filter(id => validIds.has(id));
      return {
        ...state,
        step: "confirm",
        exercises: action.exercises.map(e => ({
          ...e,
          primary: clean(e.primary),
          secondary: clean(e.secondary),
        })),
      };
    }
    case "ANALYZE_ERROR":
      return { ...state, step: "upload", error: action.error };
    case "UPDATE_EXERCISE":
      return { ...state, exercises: state.exercises.map(e => e.id === action.id ? { ...e, ...action.updates } : e) };
    case "DELETE_EXERCISE":
      return { ...state, exercises: state.exercises.filter(e => e.id !== action.id) };
    case "ADD_EXERCISE":
      return { ...state, exercises: [...state.exercises, action.exercise], editingId: action.exercise.id };
    case "SET_STEP":
      return { ...state, step: action.step };
    case "SET_SESSION_DATE":
      return { ...state, sessionDate: action.date, gymSessions: [], gymSessionId: "", gymCalendarConflict: null };
    case "SET_GYM_SESSIONS":
      return { ...state, gymSessions: action.sessions, gymSessionId: "", gymCalendarConflict: null };
    case "SET_GYM_SESSION_ID":
      return { ...state, gymSessionId: action.id };
    case "SET_GYM_CONFLICT":
      return { ...state, gymCalendarConflict: action.conflict };
    case "CONFIRM":
      return { ...state, step: "muscles", muscles: action.muscles, saving: true, saved: false, saveError: false };
    case "SAVE_SUCCESS":
      return { ...state, saving: false, saved: true };
    case "SAVE_ERROR":
      return { ...state, saving: false, saveError: true };
    case "RECS_START":
      return { ...state, loadingRecs: true, recs: null, recsError: null };
    case "RECS_SUCCESS":
      return { ...state, loadingRecs: false, recs: action.recs };
    case "RECS_ERROR":
      return { ...state, loadingRecs: false, recsError: action.error };
    case "LOAD_TEMPLATE":
      return { ...state, step: "confirm", exercises: action.exercises };
    default:
      return state;
  }
}
