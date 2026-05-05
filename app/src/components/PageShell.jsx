import { Camera, RecentlyViewed, Analytics, Book, EventSchedule, Settings, ArrowLeft } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useNav } from "../lib/NavContext";

function NavBtn({ onClick, ariaLabel, active, children }) {
  return (
    <button
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        background: active ? "var(--cds-layer-01)" : "none",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        color: active ? "var(--accent)" : "var(--cds-icon-primary)",
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

export function SectionLabel({ children, style }) {
  return (
    <p style={{
      fontFamily: "var(--cds-font-mono)",
      fontSize: 12,
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: "var(--cds-text-secondary)",
      borderLeft: "3px solid var(--accent)",
      padding: "8px 0 8px 13px",
      margin: "16px 16px 12px",
      width: "fit-content",
      ...style,
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
      fontFamily: "var(--cond)",
      fontSize: 28,
      fontWeight: 700,
      color: "var(--cds-text-primary)",
      padding: "4px 16px 16px",
      margin: 0,
      lineHeight: 1.2,
      letterSpacing: "-0.01em",
      ...style,
    }}>
      {children}
    </p>
  );
}

export function StickyCta({ children }) {
  return (
    <div style={{
      position: "sticky",
      bottom: 0,
      background: "var(--bg-canvas)",
      borderTop: "1px solid var(--border-subtle-wl)",
      padding: "12px 0",
    }}>
      {children}
    </div>
  );
}

export function AccentChip({ children, style }) {
  return (
    <span style={{
      display: "inline-block",
      borderRadius: "var(--r-pill)",
      padding: "3px 10px",
      background: "var(--accent-bg-14)",
      border: "1px solid var(--accent-bg-30)",
      color: "var(--accent-soft)",
      fontFamily: "var(--cds-font-mono)",
      fontSize: 11,
      letterSpacing: "0.06em",
      ...style,
    }}>
      {children}
    </span>
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
  const { currentView, onShowHome, onShowLogger, onShowHistory, onShowReport, onShowBibliotek, onShowSettings } = useNav();

  return (
    <div style={{ background: "var(--bg-canvas)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 48,
          borderBottom: "1px solid var(--cds-border-strong-01)",
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
              display: "flex",
              alignItems: "center",
              gap: 7,
            }}
          >
            <span style={{ width: 6, height: 6, borderRadius: "50%", background: "var(--accent)", flexShrink: 0 }} aria-hidden="true" />
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
            <NavBtn ariaLabel="Gymtimer">
              <EventSchedule size={20} />
            </NavBtn>
            <NavBtn ariaLabel="Innstillinger" onClick={onShowSettings} active={currentView === "settings"}>
              <Settings size={20} />
            </NavBtn>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
