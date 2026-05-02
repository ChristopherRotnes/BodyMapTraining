import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import MuscleMap from "./components/MuscleMap";
import History from "./components/History";
import Report from "./components/Report";
import Bibliotek from "./components/Bibliotek";
import TemplatePicker from "./components/TemplatePicker";
import TemplateSessionEditor from "./components/TemplateSessionEditor";

function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("logger");
  const [templateEditorState, setTemplateEditorState] = useState(null);
  const [pendingTemplateExercises, setPendingTemplateExercises] = useState(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;
  if (!session) return <Login />;

  if (view === "history")
    return <History
      onNewSession={() => setView("logger")}
      onShowReport={() => setView("report")}
    />;

  if (view === "report")
    return <Report
      onNewSession={() => setView("logger")}
      onShowHistory={() => setView("history")}
    />;

  if (view === "bibliotek")
    return <Bibliotek
      onBack={() => setView("logger")}
      onEditTemplate={(tpl) => {
        setTemplateEditorState({ template: tpl, mode: "edit" });
        setView("template-editor");
      }}
    />;

  if (view === "template-picker")
    return <TemplatePicker
      onBack={() => setView("logger")}
      onSelectTemplate={(tpl) => {
        setTemplateEditorState({ template: tpl, mode: "use" });
        setView("template-editor");
      }}
      onShowBibliotek={() => setView("bibliotek")}
    />;

  if (view === "template-editor" && templateEditorState)
    return <TemplateSessionEditor
      template={templateEditorState.template}
      mode={templateEditorState.mode}
      onBack={() => {
        setView(templateEditorState.mode === "edit" ? "bibliotek" : "template-picker");
        setTemplateEditorState(null);
      }}
      onUseTemplate={(exercises) => {
        setPendingTemplateExercises(exercises);
        setTemplateEditorState(null);
        setView("logger");
      }}
    />;

  return <MuscleMap
    onShowHistory={() => setView("history")}
    onShowReport={() => setView("report")}
    onShowBibliotek={() => setView("bibliotek")}
    onShowTemplatePicker={() => setView("template-picker")}
    templatePreload={pendingTemplateExercises}
    onTemplatePreloadConsumed={() => setPendingTemplateExercises(null)}
  />;
}

export default App;
