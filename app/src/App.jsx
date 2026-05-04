import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import { NavContext } from "./lib/NavContext";
import Login from "./components/Login";
import Home from "./components/Home";
import MuscleMap from "./components/MuscleMap";
import History from "./components/History";
import Report from "./components/Report";
import Bibliotek from "./components/Bibliotek";
import TemplatePicker from "./components/TemplatePicker";
import TemplateSessionEditor from "./components/TemplateSessionEditor";

function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("home");
  const [templateEditorState, setTemplateEditorState] = useState(null);
  const [pendingTemplateExercises, setPendingTemplateExercises] = useState(null);
  const [historyInitialDate, setHistoryInitialDate] = useState(null);
  const [bibliotekInitialTab, setBibliotekInitialTab] = useState(0);
  const [reportPrefill, setReportPrefill] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

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
  else
    content = <MuscleMap
      templatePreload={pendingTemplateExercises}
      onTemplatePreloadConsumed={() => setPendingTemplateExercises(null)}
    />;

  return (
    <NavContext.Provider value={navValue}>
      {content}
    </NavContext.Provider>
  );
}

export default App;
