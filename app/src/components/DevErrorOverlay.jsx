import { useState, useEffect } from "react";
import { Button } from "@carbon/react";
import { getDevErrors } from "../lib/utils";

export default function DevErrorOverlay() {
  const [entries, setEntries] = useState(() => [...getDevErrors()]);

  useEffect(() => {
    const handler = (e) => setEntries(prev => [...prev, e.detail]);
    window.addEventListener("dev-error", handler);
    return () => window.removeEventListener("dev-error", handler);
  }, []);

  if (entries.length === 0) return null;

  return (
    <div style={{
      position: "fixed", bottom: 0, left: 0, right: 0, zIndex: 9999,
      maxHeight: "40vh", overflowY: "auto",
      background: "var(--cds-layer-01)",
      borderTop: "3px solid var(--cds-support-error)",
    }}>
      {entries.map((entry, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "baseline", gap: 12,
          padding: "6px 16px",
          borderBottom: "1px solid var(--cds-border-subtle-01)",
        }}>
          <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-secondary)", flexShrink: 0 }}>
            {entry.ts.replace("T", " ").slice(0, 19)}
          </span>
          <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-support-error)", flexShrink: 0 }}>
            [{entry.context}]
          </span>
          <span style={{ fontFamily: "var(--cds-font-mono)", fontSize: 11, color: "var(--cds-text-primary)", flex: 1 }}>
            {entry.message}
          </span>
          <Button
            kind="ghost"
            size="sm"
            onClick={() => setEntries(prev => prev.filter((_, j) => j !== i))}
            style={{ flexShrink: 0, minHeight: "unset", padding: "2px 8px" }}
          >
            ×
          </Button>
        </div>
      ))}
    </div>
  );
}
