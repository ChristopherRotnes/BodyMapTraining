import { useState } from "react";
import { Button, TextInput } from "@carbon/react";
import MusclePicker from "./MusclePicker";

// Form for creating or editing a library exercise.
// Props:
//   initial  — existing exercise object for edit mode (undefined for new)
//   onSave({ name, primary_muscles, secondary_muscles, default_sets, default_reps })
//   onCancel()
//   saving   — boolean, disables the save button while in flight
export default function ExerciseForm({ initial, onSave, onCancel, saving }) {
  const [name, setName] = useState(initial?.name || "");
  const [primary, setPrimary] = useState(initial?.primary_muscles || []);
  const [secondary, setSecondary] = useState(initial?.secondary_muscles || []);
  const [defaultSets, setDefaultSets] = useState(initial?.default_sets || "");
  const [defaultReps, setDefaultReps] = useState(initial?.default_reps || "");

  return (
    <div style={{ background: "var(--cds-layer-02)", border: "1px solid var(--cds-border-strong-01)", padding: 16, marginBottom: 8 }}>
      <TextInput
        id={`ex-form-name-${initial?.id || "new"}`}
        labelText="Navn"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="f.eks. Knebøy"
        style={{ marginBottom: 12 }}
      />
      <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
        <TextInput
          id={`ex-form-sets-${initial?.id || "new"}`}
          labelText="Standard sett"
          value={defaultSets}
          onChange={(e) => setDefaultSets(e.target.value)}
          placeholder="–"
          size="sm"
        />
        <TextInput
          id={`ex-form-reps-${initial?.id || "new"}`}
          labelText="Standard reps"
          value={defaultReps}
          onChange={(e) => setDefaultReps(e.target.value)}
          placeholder="–"
          size="sm"
        />
      </div>
      <MusclePicker
        primary={primary}
        secondary={secondary}
        onChange={({ primary: p, secondary: s }) => { setPrimary(p); setSecondary(s); }}
        instanceId={initial?.id || "new"}
      />
      <div style={{ display: "flex", gap: 8, marginTop: 16 }}>
        <Button kind="secondary" size="sm" onClick={onCancel}>Avbryt</Button>
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
          {saving ? "Lagrer…" : "Lagre øvelse"}
        </Button>
      </div>
    </div>
  );
}
