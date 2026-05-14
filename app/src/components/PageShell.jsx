import { forwardRef, useState, useEffect } from "react";
import { Camera, RecentlyViewed, Analytics, Notebook, EventSchedule, Settings, ArrowLeft } from "@carbon/icons-react";
import { Button } from "@carbon/react";
import { useTranslation } from "react-i18next";
import { useNav } from "../lib/NavContext";

export function useNavHints() {
  const [hints, setHints] = useState(() => localStorage.getItem("wl-nav-hints") !== "false");

  useEffect(() => {
    function handler() {
      setHints(localStorage.getItem("wl-nav-hints") !== "false");
    }
    window.addEventListener("storage", handler);
    window.addEventListener("wl-nav-hints-change", handler);
    return () => {
      window.removeEventListener("storage", handler);
      window.removeEventListener("wl-nav-hints-change", handler);
    };
  }, []);

  function toggle(val) {
    localStorage.setItem("wl-nav-hints", val ? "true" : "false");
    window.dispatchEvent(new Event("wl-nav-hints-change"));
    setHints(val);
  }

  return [hints, toggle];
}

const navLabelStyle = (active) => ({
  fontFamily: "var(--cond)",
  fontSize: 8,
  fontWeight: 400,
  lineHeight: 1.15,
  display: "block",
  textAlign: "center",
  whiteSpace: "nowrap",
  color: active ? "var(--accent)" : "var(--cds-text-secondary)",
  letterSpacing: "0.01em",
});

const NavBtn = forwardRef(function NavBtn({ onClick, ariaLabel, active, l1, l2, children, ...rest }, ref) {
  return (
    <button
      ref={ref}
      {...rest}
      aria-label={ariaLabel}
      onClick={onClick}
      style={{
        background: active ? "var(--cds-layer-01)" : "none",
        border: "none",
        borderBottom: active ? "2px solid var(--accent)" : "2px solid transparent",
        cursor: "pointer",
        color: active ? "var(--accent)" : "var(--cds-icon-primary)",
        padding: "7px 6px 4px",
        width: 48,
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "flex-start",
        gap: 2,
        flexShrink: 0,
      }}
    >
      {children}
      {l1 && <span style={navLabelStyle(active)}>{l1}</span>}
      {l2 && <span style={navLabelStyle(active)}>{l2}</span>}
    </button>
  );
});

export function SectionLabel({ children, style, renderIcon: Icon }) {
  return (
    <p style={{
      fontFamily: "var(--cds-font-mono)",
      fontSize: 12,
      fontWeight: 400,
      textTransform: "uppercase",
      letterSpacing: "0.16em",
      color: "var(--cds-text-secondary)",
      borderInlineStart: "3px solid var(--accent)",
      paddingInlineStart: 13,
      paddingTop: 8,
      paddingBottom: 8,
      margin: "16px 16px 12px",
      width: "fit-content",
      display: "flex",
      alignItems: "center",
      gap: 6,
      ...style,
    }}>
      {Icon && <Icon size={14} />}
      {children}
    </p>
  );
}

export function PageTitle({ children, renderIcon }) {
  return <SectionLabel renderIcon={renderIcon}>{children}</SectionLabel>;
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
  const { t } = useTranslation();
  return (
    <Button
      kind="ghost"
      size="sm"
      renderIcon={ArrowLeft}
      onClick={onClick}
      style={{ paddingLeft: 0, marginBottom: 16 }}
    >
      {t("common.back")}
    </Button>
  );
}

export default function PageShell({ children }) {
  const { t } = useTranslation();
  const { currentView, onShowHome, onShowLogger, onShowHistory, onShowReport, onShowSetSammen, onShowSettings, onShowPlanlegger } = useNav();

  return (
    <div style={{ background: "var(--bg-canvas)", minHeight: "100vh" }}>
      <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 16px" }}>

        <div style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          height: 56,
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
            <NavBtn ariaLabel={t("nav.logSession")} l1="Logg" l2="økt" onClick={onShowLogger} active={currentView === "logger"}>
              <Camera size={20} />
            </NavBtn>
            <NavBtn ariaLabel={t("nav.history")} l1="Bla i" l2="historikken" onClick={onShowHistory} active={currentView === "history"}>
              <RecentlyViewed size={20} />
            </NavBtn>
            <NavBtn ariaLabel={t("nav.report")} l1="Analyser" l2="perioden" onClick={onShowReport} active={currentView === "report"}>
              <Analytics size={20} />
            </NavBtn>
            <NavBtn ariaLabel={t("nav.planner")} l1="Planlegg" l2="uka" onClick={onShowPlanlegger} active={currentView === "planlegger"}>
              <EventSchedule size={20} />
            </NavBtn>
            <NavBtn ariaLabel={t("nav.library")} l1="Sett sammen" l2="gruppetimer" onClick={onShowSetSammen} active={currentView === "sett-sammen"}>
              <Notebook size={20} />
            </NavBtn>
            <NavBtn ariaLabel={t("nav.settings")} l1="Tilpass" l2="appen" onClick={onShowSettings} active={currentView === "settings"}>
              <Settings size={20} />
            </NavBtn>
          </div>
        </div>

        {children}
      </div>
    </div>
  );
}
