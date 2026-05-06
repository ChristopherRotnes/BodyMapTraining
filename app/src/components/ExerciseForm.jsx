import { useState } from "react";
import { Button, TextInput, InlineLoading } from "@carbon/react";
import { useTranslation } from "react-i18next";
import MusclePicker from "./MusclePicker";
import { inferMusclesFromName } from "../lib/utils";

export default function ExerciseForm({ initial, onSave, onCancel, saving }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || "");
  const [primary, setPrimary] = useState(initial?.primary_muscles || []);
  const [secondary, setSecondary] = useState(initial?.secondary_muscles || []);
  const [defaultSets, setDefaultSets] = useState(initial?.default_sets || "");
  const [defaultReps, setDefaultReps] = useState(initial?.default_reps || "");
  const [inferStatus, setInferStatus] = useState(null); // null | "active" | "finished"
  const [aiInferred, setAiInferred] = useState(false);

  const handleMuscleChange = ({ primary: p, secondary: s }) => {
    setPrimary(p);
    setSecondary(s);
    setAiInferred(false);
  };

  const inferMuscles = async (nameValue) => {
    if (primary.length || secondary.length) return;
    if (aiInferred || inferStatus) return;

    setInferStatus("active");
    const result = await inferMusclesFromName(nameValue);
    if (result) {
      setPrimary(result.primary);
      setSecondary(result.secondary);
      setInferStatus("finished");
      setTimeout(() => { setInferStatus(null); setAiInferred(true); }, 1200);
    } else {
      setInferStatus(null);
    }
  };

  const noMuscles = !primary.length && !secondary.length;

  return (
    <div style={{ background: "var(--cds-layer-02)", border: "1px solid var(--cds-border-strong-01)", padding: 16, marginBottom: 8 }}>
      <TextInput
        id={`ex-form-name-${initial?.id || "new"}`}
        labelText={t("exerciseForm.nameLabel")}
        value={name}
        onChange={(e) => { setName(e.target.value); setAiInferred(false); }}
        onBlur={(e) => inferMuscles(e.target.value)}
        placeholder={t("exerciseForm.namePlaceholder")}
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TextInput
          id={`ex-form-sets-${initial?.id || "new"}`}
          labelText={t("exerciseForm.defaultSets")}
          value={defaultSets}
          onChange={(e) => setDefaultSets(e.target.value)}
          placeholder="–"
          size="sm"
        />
        <TextInput
          id={`ex-form-reps-${initial?.id || "new"}`}
          labelText={t("exerciseForm.defaultReps")}
          value={defaultReps}
          onChange={(e) => setDefaultReps(e.target.value)}
          placeholder="–"
          size="sm"
        />
      </div>
      <MusclePicker
        primary={primary}
        secondary={secondary}
        onChange={handleMuscleChange}
        instanceId={initial?.id || "new"}
      />
      {inferStatus === "active" && (
        <div style={{ marginTop: 8 }}>
          <InlineLoading description={t("exercise.inferring")} status="active" />
        </div>
      )}
      {inferStatus === "finished" && (
        <div style={{ marginTop: 8 }}>
          <InlineLoading description={t("exercise.musclesAI")} status="finished" />
        </div>
      )}
      {!inferStatus && aiInferred && (
        <p style={{ marginTop: 6, fontSize: 11, fontFamily: "var(--cds-font-mono)", color: "var(--cds-text-secondary)" }}>
          {t("exercise.musclesAI")}
        </p>
      )}
      {!inferStatus && !aiInferred && noMuscles && name.trim() && (
        <p style={{ marginTop: 6, fontSize: 11, fontFamily: "var(--cds-font-mono)", color: "var(--cds-support-error)" }}>
          {t("exerciseForm.noMusclesWarning")}
        </p>
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button kind="secondary" size="sm" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button
          kind="primary"
          size="sm"
          disabled={!name.trim() || saving}
          onClick={() => onSave({
            name: name.trim(),
            primary_muscles: primary,
            secondary_muscles: secondary,
            default_sets: defaultSets || null,
            default_reps: defaultReps || null,
          })}
        >
          {saving ? t("common.saving") : t("exerciseForm.saveExercise")}
        </Button>
      </div>
    </div>
  );
}
