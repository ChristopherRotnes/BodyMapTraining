import { supabase } from "./supabase";

// ── EXERCISE LIBRARY ──────────────────────────────────────────────────

export async function fetchLibraryExercises() {
  const { data, error } = await supabase
    .from("exercise_library")
    .select("*")
    .order("name", { ascending: true });
  if (error) throw error;
  return data;
}

export async function saveLibraryExercise({ name, primary_muscles, secondary_muscles, default_sets, default_reps }) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("exercise_library")
    .insert({ user_id: user.id, name, primary_muscles, secondary_muscles, default_sets, default_reps })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateLibraryExercise(id, { name, primary_muscles, secondary_muscles, default_sets, default_reps }) {
  const { data, error } = await supabase
    .from("exercise_library")
    .update({ name, primary_muscles, secondary_muscles, default_sets, default_reps })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteLibraryExercise(id) {
  const { error } = await supabase.from("exercise_library").delete().eq("id", id);
  if (error) throw error;
}

// ── SESSION TEMPLATES ─────────────────────────────────────────────────

export async function fetchTemplates() {
  const { data, error } = await supabase
    .from("session_templates")
    .select(`
      id, name, sort_order, used_at, created_at,
      session_template_exercises(
        id, library_exercise_id, name, primary_muscles, secondary_muscles, sets, reps, sort_order
      )
    `)
    .order("used_at", { ascending: false, nullsFirst: false });
  if (error) throw error;
  // Sort exercises within each template
  return (data || []).map(t => ({
    ...t,
    session_template_exercises: (t.session_template_exercises || [])
      .sort((a, b) => a.sort_order - b.sort_order),
  }));
}

export async function saveTemplate(name) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("session_templates")
    .insert({ user_id: user.id, name })
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function updateTemplateName(id, name) {
  const { data, error } = await supabase
    .from("session_templates")
    .update({ name })
    .eq("id", id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id) {
  const { error } = await supabase.from("session_templates").delete().eq("id", id);
  if (error) throw error;
}

export async function touchTemplate(id) {
  const { error } = await supabase
    .from("session_templates")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id);
  if (error) throw error;
}

export async function replaceTemplateExercises(templateId, exercises) {
  const { error: delErr } = await supabase
    .from("session_template_exercises")
    .delete()
    .eq("template_id", templateId);
  if (delErr) throw delErr;

  if (exercises.length === 0) return;

  const rows = exercises.map((e, i) => ({
    template_id: templateId,
    library_exercise_id: e.library_exercise_id || null,
    name: e.name,
    primary_muscles: e.primary_muscles || e.primary || [],
    secondary_muscles: e.secondary_muscles || e.secondary || [],
    sets: e.sets || null,
    reps: e.reps || null,
    sort_order: i,
  }));

  const { error } = await supabase.from("session_template_exercises").insert(rows);
  if (error) throw error;
}

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
