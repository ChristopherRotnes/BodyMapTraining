-- Sprint 3: add template_type to session_templates
-- Nullable, no default — existing rows keep null (treated as unset in UI).
ALTER TABLE session_templates ADD COLUMN IF NOT EXISTS template_type text;
