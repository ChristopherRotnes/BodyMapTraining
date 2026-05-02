import React from "react";
import { Camera, RecentlyViewed, Analytics, Book, Asleep, Light, ArrowLeft } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useTheme } from "../theme";

function NavBtn({ onClick, ariaLabel, active, children }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        background: "none",
        border: "none",
        cursor: "pointer",
        color: active ? "var(--cds-interactive)" : "var(--cds-icon-primary)",
        padding: "0 10px",
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      {children}
    </button>
  );
}

export function PageTitle({ children }) {
  return (
    <p style={{
      fontFamily: "var(--cds-font-mono)",
      fontSize: 11,
      fontWeight: 700,
      textTransform: "uppercase",
      letterSpacing: "2px",
      color: "var(--cds-text-primary)",
      borderLeft: "2px solid var(--cds-interactive)",
      paddingLeft: 8,
      margin: "0 0 24px 0",
    }}>
      {children}
    </p>
  );
}

export function BackButton({ onClick }) {
  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={ArrowLeft}
      onClick={onClick}
      style={{ paddingLeft: 0, marginBottom: 16 }}
    >
      Tilbake
    </Button>
  );
}

export default function PageShell({ onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek, currentView, children }) {
  const { theme, setTheme } = useTheme();

  return (
    <div style={{ background: "var(--cds-background)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
          borderBottom: "1px solid var(--cds-border-subtle-01)",
          marginBottom: 24,
        }}>
          <button
            onClick={onShowHome}
            style={{
              background: "none",
              border: "none",
              cursor: "pointer",
              color: "var(--cds-text-primary)",
              fontFamily: "var(--cds-font-sans)",
              fontSize: 16,
              fontWeight: 600,
              padding: 0,
            }}
          >
            Workout Lens
          </button>

          <div style={{ display: "flex", alignItems: "center", marginRight: -10 }}>
            <NavBtn ariaLabel="Logg økt" onClick={onShowLogger} active={currentView === "logger"}>
              <Camera size={20} />
            </NavBtn>
            <NavBtn ariaLabel="Treningshistorikk" onClick={onShowHistory} active={currentView === "history"}>
              <RecentlyViewed size={20} />
            </NavBtn>
            <NavBtn ariaLabel="Perioderapport" onClick={onShowReport} active={currentView === "report"}>
              <Analytics size={20} />
            </NavBtn>
            <NavBtn ariaLabel="Bibliotek" onClick={onShowBibliotek} active={currentView === "bibliotek"}>
              <Book size={20} />
            </NavBtn>
            <NavBtn ariaLabel="Bytt tema" onClick={() => setTheme(theme === "g10" ? "g100" : "g10")}>
              {theme === "g10" ? <Asleep size={20} /> : <Light size={20} />}
            </NavBtn>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
