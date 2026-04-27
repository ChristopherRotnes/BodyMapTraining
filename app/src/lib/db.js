import { supabase } from "./supabase";

export async function saveSession(exercises) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({ user_id: user.id })
    .select()
    .single();

  if (sessionError) throw sessionError;

  const rows = exercises
    .filter(e => e.enabled && e.name)
    .map(e => ({
      session_id: session.id,
      name: e.name,
      standard_name: e.standardName || null,
      sets: e.sets || null,
      reps: e.reps || null,
      primary_muscles: e.primary || [],
      secondary_muscles: e.secondary || [],
    }));

  const { error: exError } = await supabase.from("exercises").insert(rows);
  if (exError) throw exError;

  return session;
}
