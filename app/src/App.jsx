import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { ensureGymMembership, ensureDisplayName } from "./lib/db";
import { NavContext } from "./lib/NavContext";
import Login from "./components/Login";
import Home from "./components/Home";
import MuscleMap from "./components/MuscleMap";
import History from "./components/History";
import Report from "./components/Report";
import SetSammen from "./components/SetSammen";
import GruppetimePicker from "./components/GruppetimePicker";
import GruppetimeEditor from "./components/GruppetimeEditor";
import OvelsePicker from "./components/OvelsePicker";
import TemplatePicker from "./components/TemplatePicker";
import TemplateSessionEditor from "./components/TemplateSessionEditor";
import Settings from "./components/Settings";
import Planlegger from "./components/Planlegger";
import IntroModal from "./components/IntroModal";

function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("home");
  const [templateEditorState, setTemplateEditorState] = useState(null);
  const [pendingTemplateExercises, setPendingTemplateExercises] = useState(null);
  const [historyInitialDate, setHistoryInitialDate] = useState(null);
  const [reportPrefill, setReportPrefill] = useState(null);
  const [ovelsePickerShowNew, setOvelsePickerShowNew] = useState(false);
  const [gruppetimerEditorTemplate, setGruppetimerEditorTemplate] = useState(null);
  const [introOpen, setIntroOpen] = useState(false);

  const ensuredRef = useRef(false);
  useEffect(() => {
    const runEnsures = () => {
      if (ensuredRef.current) return;
      ensuredRef.current = true;
      ensureGymMembership().catch(() => {});
      ensureDisplayName().catch(() => {});
    };
    supabase.auth.getSession().then(({ data: { session } }) => {
      setSession(session);
      if (session) runEnsures();
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setSession(session);
      if ((event === "SIGNED_IN" || event === "INITIAL_SESSION") && session) runEnsures();
    });
    return () => subscription.unsubscribe();
  }, []);

  useEffect(() => {
    if (session && !localStorage.getItem("wl-intro-seen")) setIntroOpen(true);
  }, [session]);

  function handleShowIntro() {
    localStorage.removeItem("wl-intro-seen");
    setIntroOpen(true);
  }

  if (session === undefined) return null;
  if (!session) return <Login />;

  const navValue = {
    currentView: view,
    onShowHome: () => setView("home"),
    onShowLogger: () => setView("logger"),
    onShowHistory: () => { setHistoryInitialDate(null); setView("history"); },
    onShowReport: () => setView("report"),
    onShowSetSammen: () => setView("sett-sammen"),
    onShowHistoryWithDate: (dateStr) => { setHistoryInitialDate(dateStr); setView("history"); },
    onShowTemplatePicker: () => setView("template-picker"),
    onShowReportWithPrefill: (prefill) => { setReportPrefill(prefill); setView("report"); },
    onShowSettings: () => setView("settings"),
    onShowPlanlegger: () => setView("planlegger"),
  };

  let content;

  if (view === "home")
    content = <Home onShowHistoryWithDate={navValue.onShowHistoryWithDate} />;
  else if (view === "history")
    content = <History initialDate={historyInitialDate} />;
  else if (view === "report")
    content = <Report prefill={reportPrefill} onPrefillConsumed={() => setReportPrefill(null)} />;
  else if (view === "sett-sammen")
    content = <SetSammen
      onShowGruppetimePicker={() => setView("gruppetime-picker")}
      onShowOvelsePicker={() => { setOvelsePickerShowNew(false); setView("ovelse-picker"); }}
      onShowNewOvelse={() => { setOvelsePickerShowNew(true); setView("ovelse-picker"); }}
    />;
  else if (view === "gruppetime-picker")
    content = <GruppetimePicker
      onBack={() => setView("sett-sammen")}
      onEditTemplate={(tpl) => {
        setGruppetimerEditorTemplate(tpl);
        setView("gruppetime-editor");
      }}
    />;
  else if (view === "gruppetime-editor" && gruppetimerEditorTemplate)
    content = <GruppetimeEditor
      template={gruppetimerEditorTemplate}
      onBack={() => { setGruppetimerEditorTemplate(null); setView("gruppetime-picker"); }}
    />;
  else if (view === "ovelse-picker")
    content = <OvelsePicker
      key={ovelsePickerShowNew ? "new" : "browse"}
      onBack={() => setView("sett-sammen")}
      initialShowNew={ovelsePickerShowNew}
    />;
  else if (view === "template-picker")
    content = <TemplatePicker
      onBack={navValue.onShowLogger}
      onSelectTemplate={(tpl) => {
        setTemplateEditorState({ template: tpl, mode: "use" });
        setView("template-editor");
      }}
    />;
  else if (view === "settings")
    content = <Settings onShowIntro={handleShowIntro} />;
  else if (view === "template-editor" && templateEditorState)
    content = <TemplateSessionEditor
      template={templateEditorState.template}
      mode={templateEditorState.mode}
      onBack={() => {
        if (templateEditorState.mode === "edit") {
          setView("gruppetime-picker");
        } else {
          setView("template-picker");
        }
        setTemplateEditorState(null);
      }}
      onUseTemplate={(exercises) => {
        setPendingTemplateExercises(exercises);
        setTemplateEditorState(null);
        setView("logger");
      }}
    />;
  else if (view === "planlegger")
    content = <Planlegger />;
  else
    content = <MuscleMap
      templatePreload={pendingTemplateExercises}
      onTemplatePreloadConsumed={() => setPendingTemplateExercises(null)}
    />;

  return (
    <NavContext.Provider value={navValue}>
      {content}
      {introOpen && <IntroModal open={true} onClose={() => setIntroOpen(false)} />}
    </NavContext.Provider>
  );
}

export default App;
