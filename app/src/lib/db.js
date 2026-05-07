import { supabase } from "./supabase";
import { toIsoDate, weekIsoToMonday, toWeekIso } from "./utils";

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
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("exercise_library")
    .update({ name, primary_muscles, secondary_muscles, default_sets, default_reps })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function fetchTemplateNamesUsingExercise(exerciseId) {
  const { data, error } = await supabase
    .from("session_template_exercises")
    .select("session_templates(name)")
    .eq("library_exercise_id", exerciseId);
  if (error) throw error;
  return [...new Set((data || []).map(r => r.session_templates?.name).filter(Boolean))];
}

export async function deleteLibraryExercise(id) {
  const { data: { user } } = await supabase.auth.getUser();
  // Remove from any templates that reference this exercise
  await supabase.from("session_template_exercises").delete().eq("library_exercise_id", id);
  const { error } = await supabase
    .from("exercise_library")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
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
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("session_templates")
    .update({ name })
    .eq("id", id)
    .eq("user_id", user.id)
    .select()
    .single();
  if (error) throw error;
  return data;
}

export async function deleteTemplate(id) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("session_templates")
    .delete()
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function touchTemplate(id) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("session_templates")
    .update({ used_at: new Date().toISOString() })
    .eq("id", id)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function replaceTemplateExercises(templateId, exercises) {
  const { error } = await supabase.rpc('replace_template_exercises', {
    p_template_id: templateId,
    p_exercises: exercises.map((e, i) => ({
      library_exercise_id: e.library_exercise_id || null,
      name: e.name,
      primary_muscles: e.primary_muscles || e.primary || [],
      secondary_muscles: e.secondary_muscles || e.secondary || [],
      sets: e.sets || null,
      reps: e.reps || null,
      sort_order: i,
    })),
  });
  if (error) throw error;
}

export async function fetchGymSessionsByDate(dateStr) {
  const { data, error } = await supabase
    .from("gym_calendar")
    .select("id, name, start_time, end_time, instructor")
    .gte("start_time", `${dateStr}T00:00:00+02:00`)
    .lte("start_time", `${dateStr}T23:59:59+02:00`)
    .eq("cancelled", false)
    .order("start_time", { ascending: true });
  if (error) throw error;
  return data;
}

export function fetchTodayGymSessions() {
  return fetchGymSessionsByDate(new Date().toISOString().slice(0, 10));
}

export async function saveSession(exercises, { imageUrl = null, notes = null, trainingGroupId = null, gymCalendarId = null, sessionDate = null, replace = false } = {}) {
  const enabledExercises = exercises.filter(e => e.enabled && e.name);

  const { data: session, error } = await supabase.rpc('save_session', {
    p_gym_calendar_id: gymCalendarId || null,
    p_session_date: sessionDate || new Date().toISOString().slice(0, 10),
    p_image_url: imageUrl,
    p_notes: notes,
    p_training_group_id: trainingGroupId || null,
    p_exercises: enabledExercises.map((e, i) => ({
      name: e.name,
      standard_name: e.standardName || null,
      sets: e.sets ? parseInt(e.sets, 10) || null : null,
      reps: e.reps ? parseInt(e.reps, 10) || null : null,
      position: i,
      activations: [
        ...(e.primary || []).map(muscle_id => ({ muscle_id, activation_type: 'primary' })),
        ...(e.secondary || []).map(muscle_id => ({ muscle_id, activation_type: 'secondary' })),
      ],
    })),
    p_replace: replace,
  });
  if (error) throw error;
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

export async function fetchLastSession() {
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date,
      gym_calendar(name),
      session_exercises(
        id, name, sets, reps,
        muscle_activations(muscle_id, activation_type)
      )
    `)
    .order("session_date", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  if (error) throw error;
  return data;
}

export async function fetchSessionsForWeek(weekIso) {
  const mon = weekIsoToMonday(weekIso);
  const monLocal = new Date(mon.getUTCFullYear(), mon.getUTCMonth(), mon.getUTCDate());
  const weekStart = toIsoDate(monLocal);
  const sunLocal = new Date(monLocal.getFullYear(), monLocal.getMonth(), monLocal.getDate() + 6);
  const weekEnd = toIsoDate(sunLocal);
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date,
      gym_calendar(name),
      session_exercises(
        id, name,
        muscle_activations(muscle_id, activation_type)
      )
    `)
    .gte("session_date", weekStart)
    .lte("session_date", weekEnd)
    .order("session_date", { ascending: true });
  if (error) throw error;
  return data ?? [];
}

export async function fetchThisWeekSessions() {
  return fetchSessionsForWeek(toWeekIso(new Date()));
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

// ── WEEK PLANS ────────────────────────────────────────────────────────

export async function fetchWeekPlan(weekIso) {
  const { data: plan, error: planError } = await supabase
    .from("week_plans")
    .select("id, week_iso")
    .eq("week_iso", weekIso)
    .maybeSingle();
  if (planError) throw planError;
  if (!plan) return { plan: null, days: [] };

  const { data: days, error: daysError } = await supabase
    .from("week_plan_days")
    .select(`
      id, day_of_week, sort_order,
      template_id,
      session_templates(
        id, name,
        session_template_exercises(
          id, name, primary_muscles, secondary_muscles, sets, reps, sort_order
        )
      )
    `)
    .eq("plan_id", plan.id)
    .order("day_of_week", { ascending: true });
  if (daysError) throw daysError;

  return { plan, days: days || [] };
}

// assignments: [{ day_of_week: 1..7, template_id: uuid|null }]
export async function saveWeekPlan(weekIso, assignments) {
  const { data: { user } } = await supabase.auth.getUser();

  const { data: plan, error: upsertError } = await supabase
    .from("week_plans")
    .upsert({ user_id: user.id, week_iso: weekIso }, { onConflict: "user_id,week_iso" })
    .select("id")
    .single();
  if (upsertError) throw upsertError;

  await supabase.from("week_plan_days").delete().eq("plan_id", plan.id);

  if (assignments.length > 0) {
    const rows = assignments.map((a, i) => ({
      plan_id: plan.id,
      day_of_week: a.day_of_week,
      template_id: a.template_id || null,
      sort_order: i,
    }));
    const { error: insertError } = await supabase.from("week_plan_days").insert(rows);
    if (insertError) throw insertError;
  }

  return plan;
}

export async function deleteWeekPlan(weekIso) {
  const { data: { user } } = await supabase.auth.getUser();
  const { error } = await supabase
    .from("week_plans")
    .delete()
    .eq("week_iso", weekIso)
    .eq("user_id", user.id);
  if (error) throw error;
}

export async function updateSession(sessionId, exercises, gymCalendarId, { replace = false } = {}) {
  const enabledExercises = exercises.filter(e => e.enabled && e.name);

  const { error } = await supabase.rpc('update_session', {
    p_session_id: sessionId,
    p_gym_calendar_id: gymCalendarId || null,
    p_exercises: enabledExercises.map((e, i) => ({
      name: e.name,
      standard_name: e.standardName || null,
      sets: e.sets ? parseInt(e.sets, 10) || null : null,
      reps: e.reps ? parseInt(e.reps, 10) || null : null,
      position: i,
      activations: [
        ...(e.primary || []).map(muscle_id => ({ muscle_id, activation_type: 'primary' })),
        ...(e.secondary || []).map(muscle_id => ({ muscle_id, activation_type: 'secondary' })),
      ],
    })),
    p_replace: replace,
  });
  if (error) throw error;
}

// ── CLASS HISTORY ─────────────────────────────────────────────────────

export async function fetchClassHistory(gymCalendarId) {
  const { data: { user } } = await supabase.auth.getUser();
  const { data, error } = await supabase
    .from("sessions")
    .select(`
      id, session_date, trainer_id,
      profiles(display_name),
      session_exercises(
        id, name, sets, reps,
        muscle_activations(muscle_id, activation_type)
      )
    `)
    .eq("gym_calendar_id", gymCalendarId)
    .neq("trainer_id", user?.id ?? "")
    .order("session_date", { ascending: false });
  if (error) throw error;
  return data ?? [];
}

// ── PROFILES ──────────────────────────────────────────────────────────

export async function fetchDisplayName() {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("profiles")
    .select("display_name")
    .eq("id", user.id)
    .maybeSingle();
  if (error) throw error;
  return data?.display_name ?? null;
}

export async function updateDisplayName(displayName) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) throw new Error("Not authenticated");
  const trimmed = displayName.trim();
  const { error } = await supabase
    .from("profiles")
    .update({ display_name: trimmed || null })
    .eq("id", user.id);
  if (error) throw error;
}

// ── USER GYMS ─────────────────────────────────────────────────────────

export const DEFAULT_SPORTY_BUSINESS_UNIT_ID = 8;

export async function fetchMyGyms() {
  const { data, error } = await supabase
    .from("user_gyms")
    .select("id, sporty_business_unit_id, created_at")
    .order("created_at", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function fetchActiveRoles(buId = DEFAULT_SPORTY_BUSINESS_UNIT_ID) {
  const today = new Date().toISOString().slice(0, 10);
  const { data, error } = await supabase
    .from("roles")
    .select("id, name, title, valid_from, valid_to, sporty_business_unit_id")
    .eq("sporty_business_unit_id", buId)
    .lte("valid_from", today)
    .or(`valid_to.is.null,valid_to.gte.${today}`)
    .order("valid_from", { ascending: true });
  if (error) throw error;
  return data || [];
}

export async function ensureGymMembership(buId = DEFAULT_SPORTY_BUSINESS_UNIT_ID) {
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return null;
  const { data, error } = await supabase
    .from("user_gyms")
    .upsert(
      { user_id: user.id, sporty_business_unit_id: buId },
      { onConflict: "user_id,sporty_business_unit_id", ignoreDuplicates: true }
    )
    .select()
    .maybeSingle();
  if (error) throw error;
  return data;
}
