import { supabase } from "./supabase";

export async function fetchGymSessionsByDate(dateStr) {
  const { data, error } = await supabase
    .from("gym_calendar")
    .select("id, name, start_time, end_time, instructor")
    .gte("start_time", `${dateStr}T00:00:00+00:00`)
    .lte("start_time", `${dateStr}T23:59:59+00:00`)
    .eq("cancelled", false)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data;
}

export function fetchTodayGymSessions() {
  return fetchGymSessionsByDate(new Date().toISOString().slice(0, 10));
}

export async function saveSession(exercises, { imageUrl = null, notes = null, trainingGroupId = null, gymCalendarId = null, sessionDate = null, replace = false } = {}) {
  if (replace && gymCalendarId) {
    const { error: replaceErr } = await supabase
      .from("sessions")
      .delete()
      .eq("gym_calendar_id", gymCalendarId);
    if (replaceErr) throw replaceErr;
  }

  const { data: { user } } = await supabase.auth.getUser();

  const { data: session, error: sessionError } = await supabase
    .from("sessions")
    .insert({
      trainer_id: user.id,
      training_group_id: trainingGroupId,
      gym_calendar_id: gymCalendarId,
      session_date: sessionDate || new Date().toISOString().slice(0, 10),
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
    .select(`
      id, session_date,
      session_exercises(
        muscle_activations(muscle_id, activation_type)
      )
    `)
    .order("session_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSessionsForReport(fromDate, toDate) {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date, gym_calendar_id,
      gym_calendar(name, start_time),
      session_exercises(
        id, name,
        muscle_activations(muscle_id, activation_type)
      )
    `)
    .gte("session_date", fromDate)
    .lte("session_date", toDate)
    .order("session_date", { ascending: false });
  if (error) throw error;
  return data;
}

export async function fetchSessionsByDate(dateStr) {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date, created_at,
      gym_calendar_id, gym_calendar(name, start_time),
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

export async function checkGymCalendarConflict(gymCalendarId, excludeSessionId = null) {
  if (!gymCalendarId) return null;
  let query = supabase
    .from("sessions")
    .select("id, session_date, gym_calendar(name)")
    .eq("gym_calendar_id", gymCalendarId);
  if (excludeSessionId) query = query.neq("id", excludeSessionId);
  const { data, error } = await query.maybeSingle();
  if (error) throw error;
  return data; // null = no conflict
}

export async function updateSession(sessionId, exercises, gymCalendarId, { replace = false } = {}) {
  if (replace && gymCalendarId) {
    const { error: replaceErr } = await supabase
      .from("sessions")
      .delete()
      .eq("gym_calendar_id", gymCalendarId)
      .neq("id", sessionId);
    if (replaceErr) throw replaceErr;
  }

  const { error: delError } = await supabase
    .from("session_exercises")
    .delete()
    .eq("session_id", sessionId);
  if (delError) throw delError;

  const enabledExercises = exercises.filter(e => e.enabled && e.name);
  for (let i = 0; i < enabledExercises.length; i++) {
    const e = enabledExercises[i];
    const { data: ex, error: exError } = await supabase
      .from("session_exercises")
      .insert({
        session_id: sessionId,
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

  const { error: updateError } = await supabase
    .from("sessions")
    .update({ gym_calendar_id: gymCalendarId || null })
    .eq("id", sessionId);
  if (updateError) throw updateError;
}
