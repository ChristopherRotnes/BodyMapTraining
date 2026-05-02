import React, { useState } from "react";
import { Button } from "@carbon/react";
import { BodySVG, useIsMobile } from "../lib/bodymap.jsx";

// Renders a front+back body map pair: side-by-side on desktop, toggled on mobile.
// Manages its own mobile view state so parents don't need to.
export default function BodyPanel({ primary, secondary, muscleMap, marginBottom = 16 }) {
  const isMobile = useIsMobile();
  const [mobileView, setMobileView] = useState("front");

  if (isMobile) {
    return (
      <div style={{ marginBottom }}>
        <div style={{ display: "flex", gap: 8, marginBottom: 8 }}>
          {["front", "back"].map(v => (
            <Button key={v} kind={mobileView === v ? "primary" : "ghost"} size="sm"
              onClick={() => setMobileView(v)}>
              {v === "front" ? "Front" : "Bak"}
            </Button>
          ))}
        </div>
        <div style={{ maxWidth: 240, margin: "0 auto", background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
          <BodySVG view={mobileView} primary={primary} secondary={secondary} muscleMap={muscleMap} />
        </div>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: 12, marginBottom }}>
      {["front", "back"].map(view => (
        <div key={view} style={{ flex: 1, background: "var(--cds-layer-01)", border: "1px solid var(--cds-border-subtle-01)", padding: "10px 6px" }}>
          <BodySVG view={view} primary={primary} secondary={secondary} muscleMap={muscleMap} />
        </div>
      ))}
    </div>
  );
}
