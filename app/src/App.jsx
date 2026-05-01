import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import MuscleMap from "./components/MuscleMap";
import History from "./components/History";

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

  return view === "history"
    ? <History onNewSession={() => setView("logger")} />
    : <MuscleMap onShowHistory={() => setView("history")} />;
}

export default App;
