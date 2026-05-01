import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import MuscleMap from "./components/MuscleMap";
import History from "./components/History";
import Report from "./components/Report";

function App() {
  const [session, setSession] = useState(undefined);
  const [view, setView] = useState("logger");

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

  return <MuscleMap
    onShowHistory={() => setView("history")}
    onShowReport={() => setView("report")}
  />;
}

export default App;
