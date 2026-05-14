import { useEffect, useRef, useState } from "react";
import { supabase } from "./lib/supabase";
import { ensureGymMembership, ensureDisplayName } from "./lib/db";
import { NavContext } from "./lib/NavContext";
import Login from "./components/Login";
import Home from "./components/Home";
import MuscleMap from "./components/MuscleMap";
import History from "./components/History";
import Report from "./components/Report";
import Bibliotek from "./components/Bibliotek";
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
  const [bibliotekInitialTab, setBibliotekInitialTab] = useState(0);
  const [reportPrefill, setReportPrefill] = useState(null);
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
    onShowBibliotek: () => { setBibliotekInitialTab(0); setView("bibliotek"); },
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
  else if (view === "bibliotek")
    content = <Bibliotek
      initialTab={bibliotekInitialTab}
      onEditTemplate={(tpl) => {
        setTemplateEditorState({ template: tpl, mode: "edit" });
        setView("template-editor");
      }}
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
          setBibliotekInitialTab(1);
          setView("bibliotek");
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
