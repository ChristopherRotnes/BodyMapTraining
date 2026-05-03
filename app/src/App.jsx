import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
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

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <Login />;

  const nav = {
    onShowHome: () => setView("home"),
    onShowLogger: () => setView("logger"),
    onShowHistory: () => { setHistoryInitialDate(null); setView("history"); },
    onShowReport: () => setView("report"),
    onShowBibliotek: () => { setBibliotekInitialTab(0); setView("bibliotek"); },
  };

  if (view === "home")
    return <Home
      {...nav}
      currentView="home"
      onShowHistoryWithDate={(dateStr) => { setHistoryInitialDate(dateStr); setView("history"); }}
      onShowBibliotekMaler={() => { setBibliotekInitialTab(1); setView("bibliotek"); }}
    />;

  if (view === "history")
    return <History {...nav} currentView="history" initialDate={historyInitialDate} />;

  if (view === "report")
    return <Report {...nav} currentView="report" />;

  if (view === "bibliotek")
    return <Bibliotek
      {...nav}
      currentView="bibliotek"
      initialTab={bibliotekInitialTab}
      onBack={nav.onShowHome}
      onEditTemplate={(tpl) => {
        setTemplateEditorState({ template: tpl, mode: "edit" });
        setView("template-editor");
      }}
    />;

  if (view === "template-picker")
    return <TemplatePicker
      {...nav}
      currentView="template-picker"
      onBack={nav.onShowLogger}
      onSelectTemplate={(tpl) => {
        setTemplateEditorState({ template: tpl, mode: "use" });
        setView("template-editor");
      }}
    />;

  if (view === "template-editor" && templateEditorState)
    return <TemplateSessionEditor
      {...nav}
      currentView="template-editor"
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

  return <MuscleMap
    {...nav}
    currentView="logger"
    onShowTemplatePicker={() => setView("template-picker")}
    templatePreload={pendingTemplateExercises}
    onTemplatePreloadConsumed={() => setPendingTemplateExercises(null)}
  />;
}

export default App;
