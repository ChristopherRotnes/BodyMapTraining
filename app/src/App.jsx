import { useEffect, useState } from "react";
import { supabase } from "./lib/supabase";
import Login from "./components/Login";
import MuscleMap from "./components/MuscleMap";

function App() {
  const [session, setSession] = useState(undefined);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => setSession(session));
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setSession(session);
    });
    return () => subscription.unsubscribe();
  }, []);

  if (session === undefined) return null;

  return session ? <MuscleMap /> : <Login />;
}

export default App;
