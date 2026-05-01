import { supabase } from "./supabase";

export async function fetchTodayGymSessions() {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("gym_calendar")
    .select("id, name, start_time, end_time, instructor")
    .gte("start_time", `${today}T00:00:00+00:00`)
    .lte("start_time", `${today}T23:59:59+00:00`)
    .eq("cancelled", false)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveSession(exercises, { imageUrl = null, notes = null, trainingGroupId = null, gymCalendarId = null } = {}) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      trainer_id: user.id,
      training_group_id: trainingGroupId,
      gym_calendar_id: gymCalendarId,
      session_date: new Date().toISOString().slice(0, 10),
      image_url: imageUrl,
      notes,
    })
    .select()
    .single();

  if (sessionError) throw sessionError;

  const enabledExercises = exercises.filter(e => e.enabled && e.name);

  for (let i = 0; i < enabledExercises.length; i++) {
    const e = enabledExercises[i];

    const { data: ex, error: exError } = await supabase
      .from("session_exercises")
      .insert({
        session_id: session.id,
        name: e.name,
        standard_name: e.standardName || null,
        sets: e.sets ? parseInt(e.sets, 10) || null : null,
        reps: e.reps ? parseInt(e.reps, 10) || null : null,
        position: i,
      })
      .select()
      .single();

    if (exError) throw exError;

    const activations = [
      ...(e.primary || []).map(muscle_id => ({ session_exercise_id: ex.id, muscle_id, activation_type: "primary" })),
      ...(e.secondary || []).map(muscle_id => ({ session_exercise_id: ex.id, muscle_id, activation_type: "secondary" })),
    ];

    if (activations.length > 0) {
      const { error: actError } = await supabase.from("muscle_activations").insert(activations);
      if (actError) throw actError;
    }
  }

  return session;
}

export async function fetchSessions() {
  const { data, error } = await supabase
    .from("sessions")
    .select("id, session_date")
    .order("session_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSessionsByDate(dateStr) {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date, created_at,
      session_exercises(
        id, name, standard_name, sets, reps, position,
        muscle_activations(muscle_id, activation_type)
      )
    `)
    .eq("session_date", dateStr)
    .order("created_at", { ascending: false });
  if (error) throw error;
  return data;
}
