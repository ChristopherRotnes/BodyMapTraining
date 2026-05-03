import { Camera, RecentlyViewed, Analytics, Book, Asleep, Light, ArrowLeft, Logout } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useTheme } from "../theme";
import { supabase } from "../lib/supabase";
import { useNav } from "../lib/NavContext";

function NavBtn({ onClick, ariaLabel, active, children }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        background: active ? "var(--cds-layer-01)" : "none",
        border: "none",
        borderBottom: active ? "2px solid #0f62fe" : "2px solid transparent",
        cursor: "pointer",
        color: active ? "var(--cds-text-primary)" : "var(--cds-icon-primary)",
        padding: "0 10px",
        width: 48,
        height: 48,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        flexShrink: 0,
      }}
    >
      {children}
    </button>
  );
}

export function SectionLabel({ children }) {
  return (
    <p style={{
      fontFamily: "var(--cds-font-mono)",
      fontSize: 12,
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: "var(--cds-text-secondary)",
      borderLeft: "3px solid #0f62fe",
      padding: "8px 0 8px 13px",
      margin: "16px 16px 12px",
      width: "fit-content",
    }}>
      {children}
    </p>
  );
}

export function PageTitle({ children }) {
  return <SectionLabel>{children}</SectionLabel>;
}

export function PageHeading({ children, style }) {
  return (
    <p style={{
      fontFamily: "var(--cds-font-sans)",
      fontSize: 28,
      fontWeight: 300,
      color: "var(--cds-text-primary)",
      padding: "4px 16px 16px",
      margin: 0,
      lineHeight: 1.28,
      ...style,
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

export default function PageShell({ children }) {
  const { theme, setTheme } = useTheme();
  const { currentView, onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek } = useNav();

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

          <div style={{ display: "flex", alignItems: "center" }}>
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
            <NavBtn ariaLabel="Logg ut" onClick={() => supabase.auth.signOut()}>
              <Logout size={20} />
            </NavBtn>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
