import { useState } from "react";
import { Button, TextInput, InlineLoading, InlineNotification } from "@carbon/react";
import { Add, Edit } from "@carbon/icons-react";
import { useTranslation } from "react-i18next";
import MusclePicker from "./MusclePicker";
import { SectionLabel } from "./PageShell";
import { inferMusclesFromName } from "../lib/utils";

export default function ExerciseForm({ initial, onSave, onCancel, saving }) {
  const { t } = useTranslation();
  const [name, setName] = useState(initial?.name || "");
  const [primary, setPrimary] = useState(initial?.primary_muscles || []);
  const [secondary, setSecondary] = useState(initial?.secondary_muscles || []);
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
    <div style={{ background: "var(--cds-layer-02)", borderTop: "2px solid var(--accent)", padding: 16, marginBottom: 8 }}>
      <SectionLabel renderIcon={initial?.id ? Edit : Add} style={{ margin: "0 0 16px -16px" }}>
        {initial?.id ? t("exerciseForm.headerEdit") : t("exerciseForm.headerNew")}
      </SectionLabel>
      <TextInput
        id={`ex-form-name-${initial?.id || "new"}`}
        labelText={t("exerciseForm.nameLabel")}
        value={name}
        onChange={(e) => { setName(e.target.value); setAiInferred(false); }}
        onBlur={(e) => inferMuscles(e.target.value)}
        placeholder={t("exerciseForm.namePlaceholder")}
        style={{ marginBottom: 12 }}
      />
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
      {!inferStatus && aiInferred && !noMuscles && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, marginTop: 8, padding: "6px 10px", background: "var(--accent-bg-08)", border: "1px solid var(--accent-bg-30)", borderRadius: 6 }}>
          <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 10, letterSpacing: "0.1em", color: "var(--accent-soft)", background: "var(--accent-bg-14)", borderRadius: "var(--r-pill)", padding: "2px 7px", flexShrink: 0 }}>
            AI
          </span>
          <span style={{ fontFamily: "var(--cds-font-sans)", fontSize: 12, color: "var(--cds-text-secondary)", flex: 1 }}>
            {t("exercise.musclesAI")}
          </span>
          <button
            onClick={() => { setPrimary([]); setSecondary([]); setAiInferred(false); }}
            style={{ background: "none", border: "none", cursor: "pointer", fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--accent-soft)", letterSpacing: "0.06em", padding: "2px 4px", flexShrink: 0 }}
          >
            {t("exerciseForm.aiReset")}
          </button>
        </div>
      )}
      {!inferStatus && !aiInferred && noMuscles && name.trim() && (
        <InlineNotification
          kind="error"
          title={t("exerciseForm.noMusclesWarning")}
          hideCloseButton
          style={{ marginTop: 8, marginBottom: 0 }}
        />
      )}
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button kind="ghost" size="sm" onClick={onCancel}>{t("common.cancel")}</Button>
        <Button
          kind="primary"
          size="sm"
          disabled={!name.trim() || saving}
          onClick={() => onSave({
            name: name.trim(),
            primary_muscles: primary,
            secondary_muscles: secondary,
          })}
        >
          {saving ? t("common.saving") : t("exerciseForm.saveExercise")}
        </Button>
      </div>
    </div>
  );
}
